// Share the same place query between embedded maps and external directions.
// The map identifies the development; it is not a verified shop entrance pin.
const query = encodeURIComponent('Hinode Royal Park, Hoài Đức, Hà Nội');
export const storeMapEmbedUrl = `https://www.google.com/maps?q=${query}&output=embed&hl=vi&z=15`;
export const storeMapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
