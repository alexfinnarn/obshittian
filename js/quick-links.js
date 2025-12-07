// Quick Links management
import { saveQuickLinks, getQuickLinks } from './persistence.js';

// Get default links from config
const config = window.editorConfig || {};
const DEFAULT_LINKS = config.defaultQuickLinks || [];

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

    // Load saved links or use defaults
    currentLinks = getQuickLinks() || [...DEFAULT_LINKS];
    renderQuickLinks(container);

    // Configure button opens modal
    configureBtn.addEventListener('click', () => {
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
    saveBtn.addEventListener('click', () => {
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
        saveQuickLinks(currentLinks);
        renderQuickLinks(container);
        closeModal();
    });
}

function renderQuickLinks(container) {
    container.innerHTML = '';
    currentLinks.forEach(link => {
        const a = document.createElement('a');
        a.href = link.url;
        a.target = '_blank';
        a.textContent = link.name;
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
    row.innerHTML = `
        <input type="text" class="link-name" placeholder="Name" value="${escapeHtml(link.name)}">
        <input type="text" class="link-url" placeholder="URL" value="${escapeHtml(link.url)}">
        <button class="link-delete" title="Delete">×</button>
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
