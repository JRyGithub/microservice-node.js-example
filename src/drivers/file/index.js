const path = require('path');

const ctMapping = {
  '.bmp': 'image/bmp',
  '.csv': 'text/csv',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.odp': 'application/vnd.oasis.opendocument.presentation',
  '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
  '.odt': 'application/vnd.oasis.opendocument.text',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.pps': 'application/vnd.ms-powerpoint',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.text': 'text/plain',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.zip': 'application/zip'
};

function getContentType(filename) {
  const extension = path.extname(filename);

  if (!extension) return null;
  const contentType = ctMapping[extension.toLowerCase()];

  if (!contentType) return null;

  return contentType;
}

module.exports = getContentType;
