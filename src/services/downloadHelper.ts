/**
 * Download helper that fetches binary zip stream, creates an authentic Blob
 * with MIME type application/zip, and forces the browser to save as .zip
 * avoiding any unwanted .html extensions in sandboxed iframes.
 */
export async function downloadSanjuAppZip(): Promise<void> {
  try {
    const response = await fetch('/api/download-zip');
    if (!response.ok) {
      throw new Error(`Download failed with status: ${response.status}`);
    }

    const blob = await response.blob();
    // Ensure strict application/zip MIME type
    const zipBlob = new Blob([blob], { type: 'application/zip' });
    const url = URL.createObjectURL(zipBlob);

    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.setAttribute('download', 'sanju-app.zip');
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  } catch (error) {
    console.error('Direct blob download error, falling back to window location:', error);
    // Fallback: direct window navigation
    window.location.href = '/api/download-zip';
  }
}
