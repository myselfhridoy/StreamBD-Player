const fs = require('fs');
const path = require('path');

function processFile(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if it imports Text from react-native
    if (content.match(/import\s+{([^}]*)\bText\b([^}]*)}\s+from\s+['"]react-native['"]/)) {
        // Remove Text from react-native import
        content = content.replace(/import\s+{([^}]*)\bText\b([^}]*)}\s+from\s+['"]react-native['"]/, (match, p1, p2) => {
            const clean1 = p1.replace(/,\s*$/, '').trim();
            const clean2 = p2.replace(/^\s*,/, '').trim();
            const combined = [clean1, clean2].filter(Boolean).join(', ');
            if (combined.length === 0) {
                return ''; // No other imports from react-native
            }
            return `import { ${combined} } from 'react-native';`;
        });
        
        // Calculate relative path to components/Text
        const depth = filePath.split(path.sep).length - 2; // Assuming filePath is inside app/
        let relativePath = '';
        if (filePath.includes('app\\(tabs)')) {
            relativePath = '../../components/Text';
        } else if (filePath.includes('app\\')) {
            relativePath = '../components/Text';
        } else {
            relativePath = './components/Text';
        }

        // Add custom Text import
        content = `import Text from '${relativePath}';\n` + content;
        
        fs.writeFileSync(filePath, content);
        console.log('Processed', filePath);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else {
            processFile(fullPath);
        }
    }
}

walkDir('app');
