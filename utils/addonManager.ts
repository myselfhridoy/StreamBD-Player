import AsyncStorage from "@react-native-async-storage/async-storage";
import CryptoJS from "crypto-js";

export interface StreamSource {
  url: string;
  quality: string;
  provider: string;
  type?: "hls" | "mp4" | "dash" | "unknown";
  headers?: Record<string, string>;
  subtitles?: { language: string; url: string; label?: string }[];
}

// You can add your remote JSON registry URL here
const DEFAULT_REGISTRY_URL = process.env.EXPO_PUBLIC_ADDON_REGISTRY_URL || "https://streambd-iptv.netlify.app/addons/StreamBD_IPTV_Addon.json";

// Addons configuration
export interface Addon {
  id: string;
  name: string;
  url: string;      // The raw JS file URL
  enabled: boolean;
}

export class AddonManager {
  private static ADDONS_KEY = "@prysm_addons";
  private static cachedAddons: Addon[] | null = null;
  private static addonScriptsCache: Record<string, string> = {};
  
  static async getAddons(forceSync: boolean = false): Promise<Addon[]> {
    try {
      if (!forceSync && this.cachedAddons) {
        return this.cachedAddons;
      }

      let addons: Addon[] = [];
      const data = await AsyncStorage.getItem(this.ADDONS_KEY);
      if (data) {
        addons = JSON.parse(data);
      }
      
      // Auto-sync with remote registry if available
      // Only do this if forceSync is true or we have no addons yet
      if (DEFAULT_REGISTRY_URL && (forceSync || addons.length === 0)) {
        try {
          const res = await fetch(DEFAULT_REGISTRY_URL);
          if (res.ok) {
            const registryAddons: Addon[] = await res.json();
            
            let changed = false;
            for (const rAddon of registryAddons) {
              const existingIndex = addons.findIndex(a => a.id === rAddon.id);
              if (existingIndex >= 0) {
                if (addons[existingIndex].url !== rAddon.url || addons[existingIndex].name !== rAddon.name) {
                  addons[existingIndex] = rAddon;
                  changed = true;
                }
              } else {
                addons.push(rAddon);
                changed = true;
              }
            }
            if (changed) {
              await AsyncStorage.setItem(this.ADDONS_KEY, JSON.stringify(addons));
            }
          }
        } catch (e) {
          console.warn("Failed to fetch addon registry:", e);
        }
      }

      this.cachedAddons = addons;
      return addons;
    } catch (e) {
      return [];
    }
  }

  static async addAddon(addon: Addon) {
    const addons = await this.getAddons();
    addons.push(addon);
    await AsyncStorage.setItem(this.ADDONS_KEY, JSON.stringify(addons));
  }

  static async resolveFromAddons(type: "movie" | "tv", tmdbId: number, season?: number, episode?: number): Promise<StreamSource[]> {
    const addons = await this.getAddons();
    const activeAddons = addons.filter(a => a.enabled);
    
    console.log(`[AddonManager] resolveFromAddons type=${type} tmdbId=${tmdbId} season=${season} ep=${episode} activeAddons=${activeAddons.length}`);
    
    let allSources: StreamSource[] = [];

    // Run all addons in parallel
    const promises = activeAddons.map(async (addon) => {
      try {
        let jsCode = this.addonScriptsCache[addon.id];
        if (!jsCode) {
          const res = await fetch(addon.url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          jsCode = await res.text();
          this.addonScriptsCache[addon.id] = jsCode;
        }
        
        // Execute the remote JS. It should return a function.
        // We inject CryptoJS so the addon can use it directly.
        const parserFunc = new Function("CryptoJS", jsCode)(CryptoJS);
        
        // Always pass tmdbId as string so URL interpolation works in parsers
        const sources: StreamSource[] = await parserFunc(
          type,
          String(tmdbId),
          season != null ? season : undefined,
          episode != null ? episode : undefined,
        );

        console.log(`[AddonManager] ${addon.name} returned ${sources?.length ?? 0} source(s) for type=${type}`);
        
        // Ensure provider name is set to the addon name if the script forgot to set it
        return (sources || []).map(s => ({
          ...s,
          provider: s.provider || addon.name
        }));
      } catch (err) {
        console.error(`[AddonManager] Addon Error [${addon.name}] type=${type}:`, err);
        return [];
      }
    });

    const results = await Promise.all(promises);
    for (const res of results) {
      if (res && res.length > 0) {
        allSources = [...allSources, ...res];
      }
    }

    console.log(`[AddonManager] Total sources for type=${type}: ${allSources.length}`);
    return allSources;
  }
}
