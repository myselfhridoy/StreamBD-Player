import Text from '../../components/Text';
import { TVTouchable } from '../../components/TVTouchable';

import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Switch, Modal } from 'react-native';;
import { useSettings } from '../context/SettingsContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const { settings, updateSetting } = useSettings();
  const insets = useSafeAreaInsets();
  const [showSeekModal, setShowSeekModal] = useState(false);

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  const SettingToggle = ({ 
    title, description, value, onValueChange 
  }: { 
    title: string, description: string, value: boolean, onValueChange: (v: boolean) => void 
  }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingTextContainer}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        trackColor={{ false: '#333', true: '#3b82f6' }}
        thumbColor={'#fff'}
        onValueChange={onValueChange}
        value={value}
      />
    </View>
  );

  const SettingClickable = ({ 
    title, description, value, onPress 
  }: { 
    title: string, description: string, value?: string, onPress: () => void 
  }) => (
    <TVTouchable style={styles.settingRow} onPress={onPress}>
      <View style={styles.settingTextContainer}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      {value && <Text style={styles.settingValueText}>{value}</Text>}
    </TVTouchable>
  );

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SectionHeader title="General" />
        
        <SettingToggle 
          title="Auto picture-in-picture"
          description="Do not automatically switch to PiP"
          value={settings.autoPiP}
          onValueChange={(val) => updateSetting('autoPiP', val)}
        />
        
        <SettingToggle 
          title="Skip silence in Audio"
          description="Play content as is"
          value={settings.skipSilence}
          onValueChange={(val) => updateSetting('skipSilence', val)}
        />
        
        <SettingToggle 
          title="Videos are always played in landscape mode"
          description="Directly launch the player in landscape mode"
          value={settings.landscapeOnly}
          onValueChange={(val) => updateSetting('landscapeOnly', val)}
        />
        
        <SettingToggle 
          title="Volume gesture control"
          description="Use gestures to control player volume"
          value={settings.volumeGesture}
          onValueChange={(val) => updateSetting('volumeGesture', val)}
        />
        
        <SettingToggle 
          title="Brightness gesture control"
          description="Use gestures to control player brightness"
          value={settings.brightnessGesture}
          onValueChange={(val) => updateSetting('brightnessGesture', val)}
        />
        
        <SettingToggle 
          title="Resume playing"
          description="Continue playing after interruptions (e.g. phonecalls)"
          value={settings.resumePlay}
          onValueChange={(val) => updateSetting('resumePlay', val)}
        />

        <SettingClickable 
          title="Fast-forward/rewind seek duration"
          description={`${settings.seekDuration} seconds`}
          onPress={() => setShowSeekModal(true)}
        />

        <SectionHeader title="Advance Video & render options" />
        
        <SettingClickable 
          title="Select decoder"
          description={settings.preferDecoder}
          onPress={() => {
            const next = settings.preferDecoder === 'Prefer device decoders' ? 'Prefer extension decoders' : 'Prefer device decoders';
            updateSetting('preferDecoder', next);
          }}
        />

        <SettingToggle 
          title="Enable tunneling"
          description="Use hardware acceleration, more important for 4k/HDR, but may not work on all devices"
          value={settings.enableTunneling}
          onValueChange={(val) => updateSetting('enableTunneling', val)}
        />

        <SettingToggle 
          title="Dolby Vision profile 7"
          description="Play UHD Blu-ray content containing DVP7"
          value={settings.dolbyVision}
          onValueChange={(val) => updateSetting('dolbyVision', val)}
        />

        <SectionHeader title="Shortcuts" />
        <SettingClickable 
          title="Captioning preferences"
          description="System captioning settings"
          onPress={() => {}} // Could link to Android captioning intent if needed
        />

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Seek Duration Modal */}
      <Modal visible={showSeekModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seek duration</Text>
            {[5, 10, 15, 30, 60].map((sec) => (
              <TVTouchable 
                key={sec} 
                style={styles.modalOption}
                onPress={() => { updateSetting('seekDuration', sec); setShowSeekModal(false); }}
              >
                <View style={styles.radioOuter}>
                  {settings.seekDuration === sec && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.modalOptionText}>{sec} seconds</Text>
              </TVTouchable>
            ))}
            <View style={styles.modalActions}>
              <TVTouchable onPress={() => setShowSeekModal(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TVTouchable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d14',
  },
  header: {
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Inter_Bold',
  },
  scrollContent: {
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  sectionHeader: {
    color: '#4F46E5',
    fontSize: 14,
    fontFamily: 'Inter_Bold',
    marginTop: 20,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    backgroundColor: '#1a1a24',
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: 15,
  },
  settingTitle: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 4,
    fontFamily: 'Inter_SemiBold',
  },
  settingDescription: {
    color: '#8a8aa3',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Inter_Medium',
  },
  settingValueText: {
    color: '#4F46E5',
    fontSize: 14,
    fontFamily: 'Inter_SemiBold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a24',
    width: '85%',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    elevation: 10,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Inter_Bold',
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4F46E5',
    marginRight: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4F46E5',
  },
  modalOptionText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_Medium',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  modalCancel: {
    color: '#4F46E5',
    fontSize: 16,
    fontFamily: 'Inter_Bold',
  },
});
