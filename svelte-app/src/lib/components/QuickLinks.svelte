<script lang="ts">
  import Modal from './Modal.svelte';
  import { vaultConfig, setQuickLinks, type QuickLink } from '$lib/stores/vaultConfig.svelte';

  let showConfigModal = $state(false);
  let editingLinks = $state<QuickLink[]>([]);

  function openModal() {
    // Copy current links for editing
    editingLinks = vaultConfig.quickLinks.map((link) => ({ ...link }));
    showConfigModal = true;
  }

  function closeModal() {
    showConfigModal = false;
    editingLinks = [];
  }

  function addLink() {
    editingLinks = [...editingLinks, { name: '', url: '' }];
  }

  function removeLink(index: number) {
    editingLinks = editingLinks.filter((_, i) => i !== index);
  }

  function updateLinkName(index: number, name: string) {
    editingLinks[index].name = name;
  }

  function updateLinkUrl(index: number, url: string) {
    editingLinks[index].url = url;
  }

  async function saveLinks() {
    // Filter out empty links
    const validLinks = editingLinks.filter((link) => link.name.trim() && link.url.trim());
    await setQuickLinks(validLinks);
    closeModal();
  }
</script>

<section class="quick-links-section" data-testid="quick-links-section">
  <header class="section-header">
    <h3>Quick Links</h3>
    <button
      class="configure-btn"
      onclick={openModal}
      title="Configure Quick Links"
      data-testid="configure-quick-links"
    >
      &#9881;
    </button>
  </header>

  <div class="quick-links" data-testid="quick-links">
    {#each vaultConfig.quickLinks as link, i}
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="quick-link-{i}"
      >
        {link.name}
      </a>
    {/each}
    {#if vaultConfig.quickLinks.length === 0}
      <p class="empty-message">No quick links configured</p>
    {/if}
  </div>
</section>

<Modal visible={showConfigModal} title="Configure Quick Links" onclose={closeModal}>
  <div class="links-editor" data-testid="links-editor">
    {#each editingLinks as link, i}
      <div class="link-row" data-testid="link-row-{i}">
        <input
          type="text"
          class="link-name"
          placeholder="Name"
          value={link.name}
          oninput={(e) => updateLinkName(i, e.currentTarget.value)}
          data-testid="link-name-{i}"
        />
        <input
          type="text"
          class="link-url"
          placeholder="URL"
          value={link.url}
          oninput={(e) => updateLinkUrl(i, e.currentTarget.value)}
          data-testid="link-url-{i}"
        />
        <button
          class="link-delete"
          onclick={() => removeLink(i)}
          title="Delete"
          data-testid="link-delete-{i}"
        >
          &times;
        </button>
      </div>
    {/each}

    <button class="add-link-btn" onclick={addLink} data-testid="add-link">
      + Add Link
    </button>
  </div>

  {#snippet footer()}
    <button class="btn btn-secondary" onclick={closeModal} data-testid="cancel-links">
      Cancel
    </button>
    <button class="btn btn-primary" onclick={saveLinks} data-testid="save-links">
      Save
    </button>
  {/snippet}
</Modal>

<style>
  .quick-links-section {
    padding: 0.5rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.25rem 0.5rem;
  }

  .section-header h3 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-muted, #888);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .configure-btn {
    background: none;
    border: none;
    color: var(--text-muted, #888);
    cursor: pointer;
    padding: 0.25rem;
    font-size: 1rem;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .quick-links-section:hover .configure-btn {
    opacity: 1;
  }

  .configure-btn:hover {
    color: var(--text-color, #fff);
  }

  .quick-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.25rem 0.5rem;
  }

  .quick-links a {
    color: var(--link-color, #4da6ff);
    text-decoration: none;
    font-size: 0.875rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    background: var(--link-bg, rgba(77, 166, 255, 0.1));
  }

  .quick-links a:hover {
    background: var(--link-bg-hover, rgba(77, 166, 255, 0.2));
    text-decoration: underline;
  }

  .empty-message {
    color: var(--text-muted, #666);
    font-size: 0.875rem;
    font-style: italic;
    margin: 0;
  }

  /* Modal editor styles */
  .links-editor {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 400px;
  }

  .link-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .link-name {
    flex: 1;
    min-width: 100px;
  }

  .link-url {
    flex: 2;
    min-width: 200px;
  }

  .link-name,
  .link-url {
    padding: 0.5rem;
    background: var(--input-bg, #1e1e1e);
    border: 1px solid var(--border-color, #444);
    border-radius: 4px;
    color: var(--text-color, #fff);
    font-size: 0.875rem;
  }

  .link-name:focus,
  .link-url:focus {
    outline: none;
    border-color: var(--accent-color, #0078d4);
  }

  .link-delete {
    background: none;
    border: none;
    color: var(--text-muted, #888);
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
  }

  .link-delete:hover {
    color: var(--error-color, #f44);
    background: var(--hover-bg, #3a3a3a);
  }

  .add-link-btn {
    background: none;
    border: 1px dashed var(--border-color, #444);
    color: var(--text-muted, #888);
    padding: 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .add-link-btn:hover {
    border-color: var(--accent-color, #0078d4);
    color: var(--text-color, #fff);
  }

  /* Footer buttons */
  .btn {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-size: 0.875rem;
    cursor: pointer;
    border: none;
  }

  .btn-secondary {
    background: var(--button-secondary-bg, #3a3a3a);
    color: var(--text-color, #fff);
  }

  .btn-secondary:hover {
    background: var(--button-secondary-hover, #444);
  }

  .btn-primary {
    background: var(--accent-color, #0078d4);
    color: white;
  }

  .btn-primary:hover {
    background: var(--accent-color-hover, #006cbd);
  }
</style>
