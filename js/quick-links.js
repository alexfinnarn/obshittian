// Quick Links management
import { saveQuickLinks, getQuickLinks } from './persistence.js';

// Default links (used when no saved links exist)
const DEFAULT_LINKS = [
    { name: 'NWS', url: 'https://forecast.weather.gov/MapClick.php?lat=39.9103&lon=-82.7916&unit=0&lg=english&FcstType=graphical' },
    { name: 'Weather', url: 'https://www.wunderground.com/forecast/us/oh/pickerington' },
    { name: 'Gmail', url: 'https://mail.google.com/mail/u/0/#inbox' },
    { name: 'Proton', url: 'https://mail.proton.me/u/0/inbox' },
    { name: 'Bible', url: 'https://www.companionbiblecondensed.com/' },
    { name: 'Meetup', url: 'https://www.meetup.com/find/?source=EVENTS&eventType=inPerson&sortField=DATETIME&distance=twentyFiveMiles&location=us--oh--Brice' },
    { name: 'Cringe', url: 'https://cringe.com/' },
    { name: 'Cbus', url: 'https://www.experiencecolumbus.com/events/festivals-and-annual-events/' }
];

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
