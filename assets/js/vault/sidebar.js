function renderNode(node) {
  if (node.type === 'folder') {
    const li = document.createElement('li');
    li.className = 'vault-tree-folder';
    const label = document.createElement('span');
    label.className = 'vault-tree-folder-label';
    label.textContent = node.name;
    li.appendChild(label);
    const ul = document.createElement('ul');
    ul.className = 'vault-tree-children';
    node.children.forEach((child) => ul.appendChild(renderNode(child)));
    li.appendChild(ul);
    label.addEventListener('click', () => li.classList.toggle('vault-tree-folder--collapsed'));
    return li;
  }
  const li = document.createElement('li');
  li.className = 'vault-tree-file';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'vault-tree-file-btn';
  button.textContent = node.title;
  button.dataset.path = node.path;
  button.dataset.name = node.name;
  li.appendChild(button);
  return li;
}

export async function initSidebar(root, onOpen, fetchImpl = fetch) {
  root.innerHTML = '<div class="vault-status vault-status--loading">Loading vault…</div>';
  let manifest;
  try {
    const res = await fetchImpl('manifest.json');
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    manifest = await res.json();
  } catch (err) {
    root.innerHTML = `<div class="vault-status vault-status--error">Couldn't load vault index: ${err.message}</div>`;
    return;
  }

  const ul = document.createElement('ul');
  ul.className = 'vault-tree';
  (manifest.children || []).forEach((child) => ul.appendChild(renderNode(child)));
  root.innerHTML = '';
  root.appendChild(ul);

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('.vault-tree-file-btn');
    if (btn) onOpen(btn.dataset.path, btn.dataset.name);
  });
}
