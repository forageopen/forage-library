const PREFIX = 'forage-vault-sidenote:';

export function keyForPath(path) {
  return PREFIX + path;
}

export function getNote(storage, path) {
  return storage.getItem(keyForPath(path)) || '';
}

export function setNote(storage, path, text) {
  if (text) {
    storage.setItem(keyForPath(path), text);
  } else {
    storage.removeItem(keyForPath(path));
  }
}
