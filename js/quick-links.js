// Quick Links management
import { getQuickLinks, setQuickLinks } from './vault-config.js';

let currentLinks = [];

export function initQuickLinks() {
    const container = document.querySelector('.quick-links');
    const modal = document.getElementById('quick-links-modal');
    const configureBtn = document.getElementById('configure-quick-links');
    const closeBtn = modal.querySelector('.modal-close');
    const cancelBtn = document.getElementById('quick-links-cancel');
    const saveBtn = document.getElementById('quick-links-save');
    const addBtn = document.getElementById('quick-links-add');
    const linksContainer = document.getElementById('quick-links-editor');

    // Load links from vault config (already loaded by app.js)
    currentLinks = getQuickLinks();
    renderQuickLinks(container);

    // Configure button opens modal
    configureBtn.addEventListener('click', () => {
        // Refresh from vault config in case it changed
        currentLinks = getQuickLinks();
        renderLinkEditor(linksContainer);
        modal.classList.add('visible');
    });

    // Close modal handlers
    const closeModal = () => modal.classList.remove('visible');
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Add new link
    addBtn.addEventListener('click', () => {
        addLinkRow(linksContainer, { name: '', url: '' });
    });

    // Save links
    saveBtn.addEventListener('click', async () => {
        const rows = linksContainer.querySelectorAll('.link-row');
        const newLinks = [];
        rows.forEach(row => {
            const name = row.querySelector('.link-name').value.trim();
            const url = row.querySelector('.link-url').value.trim();
            if (name && url) {
                newLinks.push({ name, url });
            }
        });
        currentLinks = newLinks;
        await setQuickLinks(currentLinks);
        renderQuickLinks(container);
        closeModal();
    });
}

// Re-render quick links (call after vault config is loaded)
export function refreshQuickLinks() {
    currentLinks = getQuickLinks();
    const container = document.querySelector('.quick-links');
    if (container) {
        renderQuickLinks(container);
    }
}

function renderQuickLinks(container) {
    container.innerHTML = '';
    currentLinks.forEach((link, index) => {
        const a = document.createElement('a');
        a.href = link.url;
        a.target = '_blank';
        a.textContent = link.name;
        a.dataset.testid = `quick-link-${index}`;
        container.appendChild(a);
    });
}

function renderLinkEditor(container) {
    container.innerHTML = '';
    currentLinks.forEach(link => addLinkRow(container, link));
}

function addLinkRow(container, link) {
    const row = document.createElement('div');
    row.className = 'link-row';
    const rowIndex = container.querySelectorAll('.link-row').length;
    row.dataset.testid = `link-row-${rowIndex}`;
    row.innerHTML = `
        <input type="text" class="link-name" placeholder="Name" value="${escapeHtml(link.name)}" data-testid="link-name-${rowIndex}">
        <input type="text" class="link-url" placeholder="URL" value="${escapeHtml(link.url)}" data-testid="link-url-${rowIndex}">
        <button class="link-delete" title="Delete" data-testid="link-delete-${rowIndex}">×</button>
    `;
    row.querySelector('.link-delete').addEventListener('click', () => {
        row.remove();
    });
    container.appendChild(row);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
