import crypto from 'crypto';

// TODO: Pindahkan SECRET_KEY ke environment variable (.env) untuk keamanan lebih baik
// Kunci harus 32 karakter untuk AES-256
const SECRET_KEY = process.env.SECRET_KEY || '12345678901234567890123456789012'; 
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Mengenkripsi teks
 * @param {string} text - Teks yang akan dienkripsi
 * @returns {string} - Teks terenkripsi dalam format iv:encrypted
 */
export const encrypt = (text) => {
    if (!text) return text;
    try {
        let iv = crypto.randomBytes(IV_LENGTH);
        let cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    } catch (error) {
        console.error("Encryption error:", error);
        return text;
    }
};

/**
 * Mendekripsi teks
 * @param {string} text - Teks terenkripsi (format iv:encrypted)
 * @returns {string} - Teks asli
 */
export const decrypt = (text) => {
    if (!text) return text;
    // Cek format apakah terenkripsi (ada :)
    if (!text.includes(':')) return text; 

    try {
        let textParts = text.split(':');
        let iv = Buffer.from(textParts.shift(), 'hex');
        let encryptedText = Buffer.from(textParts.join(':'), 'hex');
        let decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error) {
        // Jika gagal decrypt (mungkin data lama belum terenkripsi), kembalikan aslinya
        return text;
    }
};
