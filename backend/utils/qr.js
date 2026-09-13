const QRCode = require('qrcode');
const crypto = require('crypto');

// Generate a QR code for a meeting. Accepts a meeting object or an ID string.
exports.generateMeetingQR = async (meeting, expiryMinutes = 30) => {
  try {
    const meetingId = meeting && meeting._id ? meeting._id.toString() : meeting;

    // Create a unique token for this meeting
    const token = crypto.randomBytes(16).toString('hex');
    
    // Create QR code data
    const qrData = {
      meetingId,
      token,
      timestamp: Date.now(),
      expiryMinutes
    };
    
    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData));
    
    return {
      qrCode: qrCodeDataUrl,
      token,
      expiresAt: new Date(Date.now() + (expiryMinutes * 60 * 1000))
    };
  } catch (error) {
    throw new Error(`Failed to generate QR code: ${error.message}`);
  }
};

// Validate QR code token
exports.validateQRToken = (qrData, token) => {
  try {
    // Parse QR data if it's a string
    const data = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
    
    // Check if token matches
    if (data.token !== token) {
      return { valid: false, reason: 'Invalid token' };
    }
    
    // Check if expired
    const expiryTime = data.timestamp + (data.expiryMinutes * 60 * 1000);
    if (Date.now() > expiryTime) {
      return { valid: false, reason: 'QR code expired' };
    }
    
    return { valid: true, meetingId: data.meetingId };
  } catch (error) {
    return { valid: false, reason: 'Invalid QR code format' };
  }
};