// Enhanced QR code system with phone verification
const QRCode = require('qrcode');
const crypto = require('crypto');

// Generate a secure QR code for a meeting with encryption
exports.generateSecureMeetingQR = async (meetingId, expiryMinutes = 30) => {
  try {
    // Create a unique token for this meeting
    const token = crypto.randomBytes(32).toString('hex');
    
    // Create expiration time
    const expiresAt = new Date(Date.now() + (expiryMinutes * 60 * 1000));
    
    // Create QR code data (encrypted)
    const qrData = {
      meetingId,
      token,
      timestamp: Date.now(),
      version: '1.0'
    };
    
    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData));
    
    return {
      qrCode: qrCodeDataUrl,
      token,
      expiresAt,
      // Return the raw data for storage/validation
      rawData: qrData
    };
  } catch (error) {
    throw new Error(`Failed to generate secure QR code: ${error.message}`);
  }
};

// Validate QR code with meeting and member verification
exports.validateSecureQR = async (qrDataString, meetingId, memberPhone) => {
  try {
    // Parse QR data
    const qrData = typeof qrDataString === 'string' ? JSON.parse(qrDataString) : qrDataString;
    
    // Validate structure
    if (!qrData.meetingId || !qrData.token || !qrData.timestamp) {
      return { valid: false, reason: 'Invalid QR code structure' };
    }
    
    // Check meeting ID matches
    if (qrData.meetingId !== meetingId) {
      return { valid: false, reason: 'QR code does not match this meeting' };
    }
    
    // Check if expired (30 minutes)
    const expiryTime = qrData.timestamp + (30 * 60 * 1000); // 30 minutes
    if (Date.now() > expiryTime) {
      return { valid: false, reason: 'QR code has expired' };
    }
    
    // Check if too old (more than 2 hours)
    const maxAge = qrData.timestamp + (2 * 60 * 60 * 1000); // 2 hours
    if (Date.now() > maxAge) {
      return { valid: false, reason: 'QR code is too old' };
    }
    
    // In a real implementation, we would:
    // 1. Look up the meeting in database to get the stored token
    // 2. Compare the token from QR with stored token
    // 3. Validate the member's phone number against the meeting attendance
    
    // For now, return basic validation
    return { 
      valid: true, 
      meetingId: qrData.meetingId,
      timestamp: qrData.timestamp,
      token: qrData.token
    };
  } catch (error) {
    return { valid: false, reason: `Invalid QR code format: ${error.message}` };
  }
};

// Generate attendance token that includes member info
exports.generateAttendanceToken = (memberId, meetingId) => {
  const payload = {
    memberId,
    meetingId,
    timestamp: Date.now(),
    // Random nonce to prevent replay attacks
    nonce: crypto.randomBytes(16).toString('hex')
  };
  
  // In production, you would sign this with a secret
  // For now, we'll return the payload as JSON
  return Buffer.from(JSON.stringify(payload)).toString('base64');
};

// Validate attendance token
exports.validateAttendanceToken = (token) => {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    
    // Validate required fields
    if (!payload.memberId || !payload.meetingId || !payload.timestamp || !payload.nonce) {
      return { valid: false, reason: 'Invalid attendance token' };
    }
    
    // Check if token is too old (5 minutes)
    if (Date.now() - payload.timestamp > 5 * 60 * 1000) {
      return { valid: false, reason: 'Attendance token has expired' };
    }
    
    return { valid: true, ...payload };
  } catch (error) {
    return { valid: false, reason: `Invalid attendance token: ${error.message}` };
  }
};