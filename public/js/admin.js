(() => {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

  async function postJson(url, body) {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-Token': csrfToken },
      body: JSON.stringify(body)
    });
    let data = {};
    try { data = await response.json(); } catch { /* non-JSON error page */ }
    if (!response.ok) throw Object.assign(new Error(data.error || `Request failed (${response.status}).`), { data, status: response.status });
    return data;
  }

  // ---------- Mobile navigation ----------
  const navToggle = document.querySelector('.adm-nav-toggle');
  navToggle?.addEventListener('click', () => {
    const open = navToggle.getAttribute('aria-expanded') !== 'true';
    navToggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('adm-nav-open', open);
  });

  // ---------- Delete confirmation ----------
  const confirmDialog = document.getElementById('admConfirm');
  document.addEventListener('submit', event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.dataset.confirm || form.dataset.confirmed === 'true') return;
    event.preventDefault();
    if (!confirmDialog?.showModal) {
      form.dataset.confirmed = 'true';
      form.requestSubmit();
      return;
    }
    confirmDialog.querySelector('#admConfirmText').textContent = form.dataset.confirm;
    confirmDialog.returnValue = '';
    confirmDialog.showModal();
    confirmDialog.addEventListener('close', () => {
      if (confirmDialog.returnValue === 'confirm') {
        form.dataset.confirmed = 'true';
        form.requestSubmit();
      }
    }, { once: true });
  });

  // ---------- Misc form helpers ----------
  document.querySelectorAll('[data-autosubmit]').forEach(select => {
    select.addEventListener('change', () => select.form?.requestSubmit());
  });

  document.querySelectorAll('[data-busy-form]').forEach(form => {
    form.addEventListener('submit', () => {
      const button = form.querySelector('[data-busy-label]');
      if (!button) return;
      button.disabled = true;
      button.textContent = button.dataset.busyLabel;
    });
  });

  // Show a selected image before it is uploaded.
  document.querySelectorAll('input[type="file"][data-file-preview]').forEach(input => {
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file || !file.type.startsWith('image/')) return;
      const scope = input.closest('form') || document;
      let target = scope.querySelector('[data-file-preview-target], [data-youtube-preview]');
      if (!target) {
        target = document.createElement('img');
        target.className = 'adm-preview';
        target.dataset.filePreviewTarget = 'image';
        input.closest('.adm-field')?.before(target);
      }
      target.hidden = false;
      target.src = URL.createObjectURL(file);
      scope.querySelector('[data-youtube-empty]')?.setAttribute('hidden', '');
    });
  });

  // ---------- Sortable lists (drag handle + keyboard) ----------
  document.querySelectorAll('.adm-sortable[data-reorder-url]').forEach(list => {
    const status = list.parentElement.querySelector('[data-reorder-status]');
    let dragged = null;
    let saveTimer = null;

    const items = () => Array.from(list.children).filter(child => child.dataset.id);

    function save() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(async () => {
        if (status) status.textContent = 'Saving order…';
        try {
          await postJson(list.dataset.reorderUrl, { ids: items().map(item => item.dataset.id) });
          if (status) status.textContent = 'Order saved.';
        } catch (error) {
          if (status) status.textContent = error.message;
        }
      }, 250);
    }

    list.addEventListener('pointerdown', event => {
      const handle = event.target.closest('.adm-handle');
      const item = handle?.closest('[data-id]');
      if (item) item.draggable = true;
    });

    list.addEventListener('dragstart', event => {
      dragged = event.target.closest('[data-id]');
      if (!dragged) return;
      dragged.classList.add('is-dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', dragged.dataset.id);
    });

    list.addEventListener('dragover', event => {
      if (!dragged) return;
      event.preventDefault();
      const over = event.target.closest('[data-id]');
      if (!over || over === dragged || over.parentElement !== list) return;
      const rect = over.getBoundingClientRect();
      const horizontal = getComputedStyle(list).display === 'grid';
      const after = horizontal
        ? event.clientX > rect.left + rect.width / 2
        : event.clientY > rect.top + rect.height / 2;
      over[after ? 'after' : 'before'](dragged);
    });

    list.addEventListener('dragend', () => {
      if (!dragged) return;
      dragged.classList.remove('is-dragging');
      dragged.draggable = false;
      dragged = null;
      save();
    });

    list.addEventListener('keydown', event => {
      const handle = event.target.closest('.adm-handle');
      if (!handle) return;
      const item = handle.closest('[data-id]');
      const back = ['ArrowUp', 'ArrowLeft'].includes(event.key);
      const forward = ['ArrowDown', 'ArrowRight'].includes(event.key);
      if (!back && !forward) return;
      event.preventDefault();
      const sibling = back ? item.previousElementSibling : item.nextElementSibling;
      if (!sibling) return;
      sibling[back ? 'before' : 'after'](item);
      handle.focus();
      if (status) status.textContent = `Moved to position ${items().indexOf(item) + 1} of ${items().length}.`;
      save();
    });
  });

  // ---------- Category picker with inline create ----------
  document.querySelectorAll('[data-category-picker]').forEach(picker => {
    const input = picker.querySelector('[data-category-new]');
    const button = picker.querySelector('[data-category-create]');
    const list = picker.querySelector('[data-category-list]');
    const status = picker.querySelector('[data-category-status]');

    async function create() {
      const name = input.value.trim();
      if (!name) { input.focus(); return; }
      button.disabled = true;
      status.textContent = 'Creating…';
      try {
        const { category, existed } = await postJson('/admin/categories', { name, mediaType: picker.dataset.mediaType });
        let checkbox = list.querySelector(`input[value="${CSS.escape(category.id)}"]`);
        if (!checkbox) {
          const label = document.createElement('label');
          label.className = 'adm-check';
          checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.name = 'categories';
          checkbox.value = category.id;
          const text = document.createElement('span');
          text.textContent = category.name;
          label.append(checkbox, ' ', text);
          list.querySelector('[data-category-empty]')?.remove();
          list.append(label);
        }
        checkbox.checked = true;
        input.value = '';
        status.textContent = existed ? `“${category.name}” already existed and is now selected.` : `Created “${category.name}”.`;
      } catch (error) {
        status.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    }

    button?.addEventListener('click', create);
    input?.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        create();
      }
    });
  });

  // ---------- Tag input ----------
  document.querySelectorAll('[data-tag-input]').forEach(wrapper => {
    const entry = wrapper.querySelector('[data-tag-entry]');
    const list = wrapper.querySelector('[data-tag-list]');
    const hidden = wrapper.querySelector('[data-tag-value]');

    const current = () => Array.from(list.querySelectorAll('.adm-tag span')).map(span => span.textContent);
    const sync = () => { hidden.value = current().join(', '); };

    function addTag(raw) {
      const tag = raw.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 40);
      if (!tag || current().includes(tag)) return;
      const item = document.createElement('li');
      item.className = 'adm-tag';
      const label = document.createElement('span');
      label.textContent = tag;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.dataset.tagRemove = '';
      remove.setAttribute('aria-label', `Remove tag ${tag}`);
      remove.textContent = '×';
      item.append(label, remove);
      list.append(item);
      sync();
    }

    entry.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault();
        addTag(entry.value);
        entry.value = '';
      } else if (event.key === 'Backspace' && !entry.value) {
        list.lastElementChild?.remove();
        sync();
      }
    });
    // Picking a suggestion from the datalist fires "input" with the full value.
    entry.addEventListener('input', event => {
      if (event.inputType === 'insertReplacementText' || event.inputType === undefined) {
        const options = Array.from(document.getElementById(entry.getAttribute('list'))?.options || []).map(o => o.value);
        if (options.includes(entry.value)) {
          addTag(entry.value);
          entry.value = '';
        }
      }
    });
    entry.addEventListener('blur', () => {
      if (entry.value.trim()) {
        addTag(entry.value);
        entry.value = '';
      }
    });
    list.addEventListener('click', event => {
      const remove = event.target.closest('[data-tag-remove]');
      if (!remove) return;
      remove.closest('.adm-tag').remove();
      sync();
      entry.focus();
    });
  });

  // ---------- Film form: live YouTube preview ----------
  const filmForm = document.querySelector('[data-film-form]');
  if (filmForm) {
    const urlInput = filmForm.querySelector('[data-youtube-input]');
    const titleInput = filmForm.querySelector('[data-title-input]');
    const preview = filmForm.querySelector('[data-youtube-preview]');
    const empty = filmForm.querySelector('[data-youtube-empty]');
    const status = filmForm.querySelector('[data-youtube-status]');
    const defaultStatus = status.textContent;
    let lookupTimer = null;
    let lastLookup = urlInput.value.trim();
    let autoTitle = '';

    async function lookup() {
      const url = urlInput.value.trim();
      if (url === lastLookup) return;
      lastLookup = url;
      if (!url) { status.textContent = defaultStatus; return; }
      status.textContent = 'Checking YouTube…';
      try {
        const data = await postJson('/admin/film/lookup', { url, itemId: filmForm.dataset.itemId });
        if (url !== urlInput.value.trim()) return;
        const hasCustom = filmForm.querySelector('#thumbnail')?.files?.length;
        if (!hasCustom) {
          preview.src = data.thumbnailUrl;
          preview.hidden = false;
          empty.hidden = true;
        }
        if (!titleInput.value.trim() || titleInput.value === autoTitle) {
          titleInput.value = data.title;
          autoTitle = data.title;
        }
        status.textContent = data.duplicate
          ? `Found “${data.title}” — note: this video is already in your films as “${data.duplicate}”.`
          : `Found “${data.title}”${data.author ? ` by ${data.author}` : ''}.`;
      } catch (error) {
        if (error.data?.thumbnailUrl) {
          preview.src = error.data.thumbnailUrl;
          preview.hidden = false;
          empty.hidden = true;
        }
        status.textContent = error.message;
      }
    }

    urlInput.addEventListener('input', () => {
      clearTimeout(lookupTimer);
      lookupTimer = setTimeout(lookup, 450);
    });
    urlInput.addEventListener('paste', () => {
      clearTimeout(lookupTimer);
      setTimeout(lookup, 0);
    });
  }

  // ---------- Photography uploader ----------
  const uploader = document.querySelector('[data-photo-uploader]');
  if (uploader) {
    const maxBytes = Number(uploader.dataset.maxMb || 15) * 1024 * 1024;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    const dropzone = uploader.querySelector('[data-dropzone]');
    const fileInput = uploader.querySelector('[data-file-input]');
    const linkInput = uploader.querySelector('[data-link-input]');
    const linkAdd = uploader.querySelector('[data-link-add]');
    const batchForm = uploader.querySelector('[data-batch-form]');
    const queue = uploader.querySelector('[data-queue]');
    const template = uploader.querySelector('[data-queue-template]');
    const uploadAll = uploader.querySelector('[data-upload-all]');
    const countLabel = uploader.querySelector('[data-queue-count]');
    const emptyLabel = uploader.querySelector('[data-queue-empty]');
    const doneLabel = uploader.querySelector('[data-queue-done]');
    let counter = 0;
    let running = false;

    batchForm.addEventListener('submit', event => event.preventDefault());

    function titleFromName(name) {
      return name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\w/, c => c.toUpperCase()).slice(0, 140);
    }

    function refreshQueueState() {
      const pending = queue.querySelectorAll('.adm-queue-item:not(.is-done)').length;
      countLabel.textContent = `(${queue.children.length})`;
      emptyLabel.hidden = queue.children.length > 0;
      uploadAll.disabled = running || pending === 0;
    }

    function addQueueItem({ file, url }) {
      const node = template.content.firstElementChild.cloneNode(true);
      counter += 1;
      const id = `q${counter}`;
      node.querySelectorAll('[data-q-label]').forEach(label => { label.htmlFor = `${id}-${label.dataset.qLabel}`; });
      node.querySelector('[data-q-title]').id = `${id}-title`;
      node.querySelector('[data-q-alt]').id = `${id}-alt`;
      const preview = node.querySelector('[data-q-preview]');
      const source = node.querySelector('[data-q-source]');
      const status = node.querySelector('[data-q-status]');

      if (file) {
        node.queueFile = file;
        preview.src = URL.createObjectURL(file);
        source.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)}MB`;
        node.querySelector('[data-q-title]').value = titleFromName(file.name);
        if (!allowed.includes(file.type)) {
          node.classList.add('is-error', 'is-done');
          status.textContent = 'Not a JPG, PNG, WebP or AVIF image — skipped.';
        } else if (file.size > maxBytes) {
          node.classList.add('is-error', 'is-done');
          status.textContent = `Larger than ${uploader.dataset.maxMb}MB — skipped.`;
        }
      } else {
        node.queueUrl = url;
        preview.src = url;
        preview.addEventListener('error', () => { preview.classList.add('is-broken'); }, { once: true });
        source.textContent = url;
        const last = decodeURIComponent(new URL(url).pathname.split('/').pop() || '');
        node.querySelector('[data-q-title]').value = titleFromName(last) || 'Untitled';
        const progress = node.querySelector('[data-q-progress]');
        progress.removeAttribute('value'); // indeterminate while the server downloads
        progress.hidden = true;
      }

      node.querySelector('[data-q-remove]').addEventListener('click', () => {
        if (node.classList.contains('is-uploading')) return;
        node.remove();
        refreshQueueState();
      });
      queue.append(node);
      doneLabel.hidden = true;
      refreshQueueState();
    }

    function addFiles(files) {
      Array.from(files || []).forEach(file => addQueueItem({ file }));
    }

    fileInput.addEventListener('change', () => {
      addFiles(fileInput.files);
      fileInput.value = '';
    });
    ['dragenter', 'dragover'].forEach(type => dropzone.addEventListener(type, event => {
      event.preventDefault();
      dropzone.classList.add('is-over');
    }));
    ['dragleave', 'drop'].forEach(type => dropzone.addEventListener(type, event => {
      event.preventDefault();
      dropzone.classList.remove('is-over');
    }));
    dropzone.addEventListener('drop', event => addFiles(event.dataTransfer?.files));
    dropzone.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        fileInput.click();
      }
    });
    dropzone.tabIndex = 0;
    dropzone.setAttribute('role', 'button');

    linkAdd.addEventListener('click', () => {
      const lines = linkInput.value.split(/\s+/).map(line => line.trim()).filter(Boolean);
      const invalid = [];
      lines.forEach(line => {
        try {
          const parsed = new URL(line);
          if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
          addQueueItem({ url: parsed.href });
        } catch {
          invalid.push(line);
        }
      });
      linkInput.value = invalid.join('\n');
      if (invalid.length) linkInput.setCustomValidity('Some lines are not valid http(s) links.');
      else linkInput.setCustomValidity('');
      linkInput.reportValidity();
    });

    function batchFields() {
      const data = new FormData(batchForm);
      return {
        categories: data.getAll('categories'),
        tags: String(data.get('tags') || ''),
        published: data.get('published') ? 'on' : ''
      };
    }

    function uploadFile(node, fields) {
      return new Promise(resolve => {
        const body = new FormData();
        body.append('title', fields.title);
        body.append('alt', fields.alt);
        body.append('tags', fields.tags);
        if (fields.published) body.append('published', 'on');
        if (fields.featured) body.append('featured', 'on');
        fields.categories.forEach(id => body.append('categories', id));
        body.append('image', node.queueFile, node.queueFile.name);

        const xhr = new XMLHttpRequest();
        const progress = node.querySelector('[data-q-progress]');
        xhr.open('POST', '/admin/photography/upload');
        xhr.setRequestHeader('X-CSRF-Token', csrfToken);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.upload.addEventListener('progress', event => {
          if (event.lengthComputable) progress.value = Math.round((event.loaded / event.total) * 95);
        });
        xhr.addEventListener('load', () => {
          let data = {};
          try { data = JSON.parse(xhr.responseText); } catch { /* ignore */ }
          resolve(xhr.status < 300 ? { ok: true } : { ok: false, error: data.error || `Upload failed (${xhr.status}).` });
        });
        xhr.addEventListener('error', () => resolve({ ok: false, error: 'Network error — check your connection.' }));
        xhr.send(body);
      });
    }

    async function importLink(node, fields) {
      try {
        await postJson('/admin/photography/import', { url: node.queueUrl, ...fields, featured: fields.featured ? 'on' : '' });
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error.message };
      }
    }

    async function processItem(node, shared) {
      const title = node.querySelector('[data-q-title]');
      const alt = node.querySelector('[data-q-alt]');
      const status = node.querySelector('[data-q-status]');
      const progress = node.querySelector('[data-q-progress]');
      if (!title.value.trim() || !alt.value.trim()) {
        node.classList.add('is-error');
        status.textContent = 'Add a title and alt text first.';
        (title.value.trim() ? alt : title).focus();
        return false;
      }
      node.classList.remove('is-error');
      node.classList.add('is-uploading');
      progress.hidden = false;
      status.textContent = node.queueFile ? 'Uploading…' : 'Downloading and checking the image…';
      const fields = { ...shared, title: title.value.trim(), alt: alt.value.trim(), featured: node.querySelector('[data-q-featured]').checked };
      const result = node.queueFile ? await uploadFile(node, fields) : await importLink(node, fields);
      node.classList.remove('is-uploading');
      if (result.ok) {
        node.classList.add('is-done', 'is-success');
        progress.value = 100;
        status.textContent = 'Added.';
        node.querySelectorAll('input').forEach(input => { input.disabled = true; });
      } else {
        node.classList.add('is-error');
        progress.value = 0;
        status.textContent = result.error;
      }
      return result.ok;
    }

    uploadAll.addEventListener('click', async () => {
      running = true;
      refreshQueueState();
      const shared = batchFields();
      const pending = Array.from(queue.querySelectorAll('.adm-queue-item:not(.is-done)'));
      // Two at a time keeps progress readable without saturating the uplink.
      const workers = [0, 1].map(async () => {
        while (pending.length) await processItem(pending.shift(), shared);
      });
      await Promise.all(workers);
      running = false;
      refreshQueueState();
      const failed = queue.querySelectorAll('.adm-queue-item.is-error:not(.is-done)').length;
      doneLabel.hidden = failed > 0 || !queue.querySelector('.is-success');
    });

    refreshQueueState();
  }
})();
