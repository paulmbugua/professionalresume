import fs from 'fs';
import path from 'path';

const baseUrl =
  process.env.NODE_ENV === 'production'
    ? process.env.PROD_BACKEND_URL
    : process.env.BACKEND_URL;

const deleteLocalFile = async (fileUrl) => {
  try {
    // If fileUrl is absolute and starts with the baseUrl, remove the baseUrl portion.
    let relativeUrl = fileUrl;
    if (fileUrl.startsWith(baseUrl)) {
      relativeUrl = fileUrl.substring(baseUrl.length);
    }
    // Ensure the relative URL starts with a '/'
    if (!relativeUrl.startsWith('/')) {
      relativeUrl = '/' + relativeUrl;
    }
    // Extract the file name from the URL (assumes URL structure: /uploads/filename)
    const fileName = relativeUrl.split('/').pop();
    // Build the absolute file path in the "uploads" directory.
    const filePath = path.join(process.cwd(), 'uploads', fileName);
    await fs.promises.unlink(filePath);
  } catch (error) {
    console.error(`Error deleting file at ${fileUrl}:`, error);
    throw new Error(`Error deleting file: ${error.message}`);
  }
};

export default deleteLocalFile;
