import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
    const htmlPath = join(__dirname, 'frontend', 'public', 'lottery.html');
    const htmlContent = readFileSync(htmlPath, 'utf8');
    const contentBytes = ethers.toUtf8Bytes(htmlContent);
    const hash = ethers.keccak256(contentBytes);
    console.log('Generated Hash:', hash);
} catch (error) {
    console.error('Error:', error.message);
}