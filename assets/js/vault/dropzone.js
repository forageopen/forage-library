export function initDropzone(root, onFile) {
  const input = root.querySelector('.vault-dropzone-input');

  input.addEventListener('change', () => {
    const file = input.files[0];
    if (file) onFile(file);
    input.value = '';
  });

  ['dragenter', 'dragover'].forEach((evt) => {
    root.addEventListener(evt, (e) => {
      e.preventDefault();
      root.classList.add('vault-dropzone--active');
    });
  });

  ['dragleave', 'drop'].forEach((evt) => {
    root.addEventListener(evt, (e) => {
      e.preventDefault();
      root.classList.remove('vault-dropzone--active');
    });
  });

  root.addEventListener('drop', (e) => {
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) onFile(file);
  });

  return { root };
}
