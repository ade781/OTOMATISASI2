import {
    getEmailLogsByUser,
    getEmailLogById,
    getEmailStats,
    searchEmailLogs,
    updateEmailLogStatus
} from '../models/EmailLogModel.js';

/**
 * Get email history for logged-in user
 */
export const getEmailHistory = (req, res) => {
    const { user_id, limit = 50, offset = 0 } = req.query;

    if (!user_id) {
        return res.status(400).json({ success: false, message: 'User ID diperlukan' });
    }

    getEmailLogsByUser(user_id, limit, offset, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Gagal mengambil riwayat email' });
        }

        res.json({
            success: true,
            count: results.length,
            emails: results
        });
    });
};

/**
 * Get email detail by ID
 */
export const getEmailDetail = (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Email ID diperlukan' });
    }

    getEmailLogById(id, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Gagal mengambil detail email' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Email tidak ditemukan' });
        }

        res.json({
            success: true,
            email: results[0]
        });
    });
};

/**
 * Get email statistics
 */
export const getStats = (req, res) => {
    const { user_id } = req.query;

    if (!user_id) {
        return res.status(400).json({ success: false, message: 'User ID diperlukan' });
    }

    getEmailStats(user_id, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Gagal mengambil statistik' });
        }

        res.json({
            success: true,
            stats: results[0]
        });
    });
};

/**
 * Search email logs
 */
export const searchEmails = (req, res) => {
    const { user_id, q } = req.query;

    if (!user_id || !q) {
        return res.status(400).json({ success: false, message: 'User ID dan query search diperlukan' });
    }

    searchEmailLogs(user_id, q, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Gagal mencari email' });
        }

        res.json({
            success: true,
            count: results.length,
            emails: results
        });
    });
};

/**
 * Update email status
 */
export const updateStatus = (req, res) => {
    const { id, status } = req.body;

    if (!id || !status) {
        return res.status(400).json({ success: false, message: 'ID dan status diperlukan' });
    }

    const validStatuses = ['sent', 'failed', 'replied', 'pending'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Status tidak valid' });
    }

    updateEmailLogStatus(id, status, (err) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Gagal mengupdate status' });
        }

        res.json({
            success: true,
            message: 'Status berhasil diupdate'
        });
    });
};
