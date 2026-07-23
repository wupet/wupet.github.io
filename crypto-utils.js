// crypto-utils.js — a reusable module

/**
 * Hashes a string using SHA-256.
 * @param {string} message - The text to hash
 * @returns {Promise<string>} Hex-encoded hash
 */
export async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message); //encodes string as raw bytes
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer); //creates the hash buffer
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // converts data from hash buffer into an array
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); //converts data back into string
}