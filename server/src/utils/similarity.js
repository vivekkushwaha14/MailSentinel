/**
 * Calculates the Levenshtein distance between two strings
 * @param {string} a 
 * @param {string} b 
 * @returns {number}
 */
exports.levenshteinDistance = (a, b) => {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

/**
 * Calculates string similarity percentage
 * @param {string} a 
 * @param {string} b 
 * @returns {number} 0 to 1
 */
exports.calculateSimilarity = (a, b) => {
  const distance = exports.levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1.0;
  return 1.0 - distance / maxLength;
};

/**
 * Checks for common character substitutions (homoglyphs)
 * @param {string} str 
 * @returns {string} Normalized string
 */
exports.normalizeChars = (str) => {
  return str
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'l')
    .replace(/i/g, 'l')
    .replace(/5/g, 's')
    .replace(/@/g, 'a')
    .replace(/vv/g, 'w'); // simplified
};
