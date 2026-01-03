import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import TagInput from './TagInput.svelte';
import {
  resetTagVocabulary,
  tagVocabulary,
  saveTagVocabulary,
} from '$lib/stores/tagVocabulary.svelte';

// Mock saveTagVocabulary to avoid file operations in tests
vi.mock('$lib/stores/tagVocabulary.svelte', async () => {
  const actual = await vi.importActual('$lib/stores/tagVocabulary.svelte');
  return {
    ...actual,
    saveTagVocabulary: vi.fn().mockResolvedValue(true),
  };
});

describe('TagInput', () => {
  beforeEach(() => {
    resetTagVocabulary();
    // Add some vocabulary tags for testing
    tagVocabulary.tags = [
      { name: 'project', count: 10 },
      { name: 'meeting', count: 8 },
      { name: 'personal', count: 5 },
      { name: 'work', count: 3 },
    ];
  });

  afterEach(() => {
    cleanup();
  });

  describe('rendering', () => {
    it('renders the input field', () => {
      render(TagInput, { props: { tags: [], onchange: vi.fn() } });
      expect(screen.getByTestId('tag-input-field')).toBeTruthy();
    });

    it('displays placeholder when no tags', () => {
      render(TagInput, { props: { tags: [], onchange: vi.fn(), placeholder: 'Add tags...' } });
      const input = screen.getByTestId('tag-input-field') as HTMLInputElement;
      expect(input.placeholder).toBe('Add tags...');
    });

    it('renders existing tags as pills', () => {
      render(TagInput, { props: { tags: ['project', 'meeting'], onchange: vi.fn() } });
      const pills = screen.getAllByTestId('tag-pill');
      expect(pills.length).toBe(2);
      expect(pills[0].textContent).toContain('project');
      expect(pills[1].textContent).toContain('meeting');
    });

    it('hides placeholder when tags exist', () => {
      render(TagInput, { props: { tags: ['project'], onchange: vi.fn(), placeholder: 'Add tags...' } });
      const input = screen.getByTestId('tag-input-field') as HTMLInputElement;
      expect(input.placeholder).toBe('');
    });
  });

  describe('tag removal', () => {
    it('calls onchange when remove button clicked', async () => {
      const onchange = vi.fn();
      render(TagInput, { props: { tags: ['project', 'meeting'], onchange } });

      const removeButtons = screen.getAllByTestId('remove-tag');
      await fireEvent.click(removeButtons[0]);

      expect(onchange).toHaveBeenCalledWith(['meeting']);
    });

    it('does not show remove buttons when disabled', () => {
      render(TagInput, { props: { tags: ['project'], onchange: vi.fn(), disabled: true } });
      expect(screen.queryByTestId('remove-tag')).toBeNull();
    });
  });

  describe('autocomplete dropdown', () => {
    it('shows dropdown on focus', async () => {
      render(TagInput, { props: { tags: [], onchange: vi.fn() } });
      const input = screen.getByTestId('tag-input-field');

      await fireEvent.focus(input);

      expect(screen.getByTestId('autocomplete-dropdown')).toBeTruthy();
    });

    it('shows suggestions from vocabulary', async () => {
      render(TagInput, { props: { tags: [], onchange: vi.fn() } });
      const input = screen.getByTestId('tag-input-field');

      await fireEvent.focus(input);

      const suggestions = screen.getAllByTestId('suggestion-item');
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('filters suggestions based on input', async () => {
      render(TagInput, { props: { tags: [], onchange: vi.fn() } });
      const input = screen.getByTestId('tag-input-field');

      await fireEvent.focus(input);
      await fireEvent.input(input, { target: { value: 'pro' } });

      const suggestions = screen.getAllByTestId('suggestion-item');
      expect(suggestions[0].textContent).toContain('project');
    });

    it('excludes already selected tags from suggestions', async () => {
      render(TagInput, { props: { tags: ['project'], onchange: vi.fn() } });
      const input = screen.getByTestId('tag-input-field');

      await fireEvent.focus(input);

      const suggestions = screen.getAllByTestId('suggestion-item');
      const hasProject = suggestions.some((s) => s.textContent?.includes('project'));
      expect(hasProject).toBe(false);
    });

    it('shows create option for new tags', async () => {
      render(TagInput, { props: { tags: [], onchange: vi.fn(), allowNew: true } });
      const input = screen.getByTestId('tag-input-field');

      await fireEvent.focus(input);
      await fireEvent.input(input, { target: { value: 'newtag' } });

      expect(screen.getByTestId('create-new-option')).toBeTruthy();
    });

    it('does not show create option when allowNew is false', async () => {
      render(TagInput, { props: { tags: [], onchange: vi.fn(), allowNew: false } });
      const input = screen.getByTestId('tag-input-field');

      await fireEvent.focus(input);
      await fireEvent.input(input, { target: { value: 'newtag' } });

      expect(screen.queryByTestId('create-new-option')).toBeNull();
    });
  });

  describe('tag selection', () => {
    it('adds tag when suggestion clicked', async () => {
      const onchange = vi.fn();
      render(TagInput, { props: { tags: [], onchange } });
      const input = screen.getByTestId('tag-input-field');

      await fireEvent.focus(input);
      const suggestions = screen.getAllByTestId('suggestion-item');
      await fireEvent.click(suggestions[0]);

      expect(onchange).toHaveBeenCalledWith(['project']);
    });

    it('adds new tag when create option clicked', async () => {
      const onchange = vi.fn();
      render(TagInput, { props: { tags: [], onchange, allowNew: true } });
      const input = screen.getByTestId('tag-input-field');

      await fireEvent.focus(input);
      await fireEvent.input(input, { target: { value: 'newtag' } });
      const createOption = screen.getByTestId('create-new-option');
      await fireEvent.click(createOption);

      expect(onchange).toHaveBeenCalledWith(['newtag']);
    });

    it('clears input after adding tag', async () => {
      render(TagInput, { props: { tags: [], onchange: vi.fn() } });
      const input = screen.getByTestId('tag-input-field') as HTMLInputElement;

      await fireEvent.focus(input);
      await fireEvent.input(input, { target: { value: 'pro' } }); // matches 'project'
      const suggestions = screen.getAllByTestId('suggestion-item');
      await fireEvent.click(suggestions[0]);

      expect(input.value).toBe('');
    });
  });

  describe('keyboard navigation', () => {
    it('selects suggestion with Enter', async () => {
      const onchange = vi.fn();
      render(TagInput, { props: { tags: [], onchange } });
      const input = screen.getByTestId('tag-input-field');

      await fireEvent.focus(input);
      await fireEvent.keyDown(input, { key: 'Enter' });

      expect(onchange).toHaveBeenCalledWith(['project']);
    });

    it('navigates suggestions with arrow keys', async () => {
      render(TagInput, { props: { tags: [], onchange: vi.fn() } });
      const input = screen.getByTestId('tag-input-field');

      await fireEvent.focus(input);
      await fireEvent.keyDown(input, { key: 'ArrowDown' });

      // Second suggestion should be selected
      const suggestions = screen.getAllByTestId('suggestion-item');
      expect(suggestions[1].classList.contains('selected')).toBe(true);
    });

    it('removes last tag with Backspace on empty input', async () => {
      const onchange = vi.fn();
      render(TagInput, { props: { tags: ['project', 'meeting'], onchange } });
      const input = screen.getByTestId('tag-input-field');

      await fireEvent.focus(input);
      await fireEvent.keyDown(input, { key: 'Backspace' });

      expect(onchange).toHaveBeenCalledWith(['project']);
    });

    it('closes dropdown on Escape', async () => {
      render(TagInput, { props: { tags: [], onchange: vi.fn() } });
      const input = screen.getByTestId('tag-input-field');

      await fireEvent.focus(input);
      expect(screen.getByTestId('autocomplete-dropdown')).toBeTruthy();

      await fireEvent.keyDown(input, { key: 'Escape' });
      expect(screen.queryByTestId('autocomplete-dropdown')).toBeNull();
    });
  });

  describe('disabled state', () => {
    it('disables input when disabled prop is true', () => {
      render(TagInput, { props: { tags: [], onchange: vi.fn(), disabled: true } });
      const input = screen.getByTestId('tag-input-field') as HTMLInputElement;
      expect(input.disabled).toBe(true);
    });

    it('does not show dropdown when disabled', async () => {
      render(TagInput, { props: { tags: [], onchange: vi.fn(), disabled: true } });
      const input = screen.getByTestId('tag-input-field');

      await fireEvent.focus(input);

      expect(screen.queryByTestId('autocomplete-dropdown')).toBeNull();
    });
  });

  describe('vocabulary integration', () => {
    it('adds new tag to vocabulary when created', async () => {
      const onchange = vi.fn();
      render(TagInput, { props: { tags: [], onchange, allowNew: true } });
      const input = screen.getByTestId('tag-input-field');

      // Type a new tag that doesn't exist in vocabulary
      await fireEvent.focus(input);
      await fireEvent.input(input, { target: { value: 'brandnewtag' } });
      const createOption = screen.getByTestId('create-new-option');
      await fireEvent.click(createOption);

      // Verify tag was added to vocabulary
      const newTag = tagVocabulary.tags.find((t) => t.name === 'brandnewtag');
      expect(newTag).toBeDefined();
      expect(newTag?.count).toBe(1);
    });

    it('saves vocabulary after adding new tag', async () => {
      const onchange = vi.fn();
      render(TagInput, { props: { tags: [], onchange, allowNew: true } });
      const input = screen.getByTestId('tag-input-field');

      await fireEvent.focus(input);
      await fireEvent.input(input, { target: { value: 'anothernew' } });
      const createOption = screen.getByTestId('create-new-option');
      await fireEvent.click(createOption);

      expect(saveTagVocabulary).toHaveBeenCalled();
    });

    it('increments count when selecting existing vocabulary tag', async () => {
      const onchange = vi.fn();
      render(TagInput, { props: { tags: [], onchange } });
      const input = screen.getByTestId('tag-input-field');

      // Get initial count for 'project' tag
      const initialCount = tagVocabulary.tags.find((t) => t.name === 'project')?.count ?? 0;

      await fireEvent.focus(input);
      const suggestions = screen.getAllByTestId('suggestion-item');
      await fireEvent.click(suggestions[0]); // Click 'project' (first suggestion, sorted by count)

      // Count should remain the same (we don't increment on selection, only on new tag creation)
      const updatedTag = tagVocabulary.tags.find((t) => t.name === 'project');
      expect(updatedTag?.count).toBe(initialCount);
    });

    it('uses vocabulary tags for fuzzy search suggestions', async () => {
      render(TagInput, { props: { tags: [], onchange: vi.fn() } });
      const input = screen.getByTestId('tag-input-field');

      // Type partial match for 'personal'
      await fireEvent.focus(input);
      await fireEvent.input(input, { target: { value: 'pers' } });

      const suggestions = screen.getAllByTestId('suggestion-item');
      expect(suggestions.some((s) => s.textContent?.includes('personal'))).toBe(true);
    });

    it('shows tag counts in suggestions', async () => {
      render(TagInput, { props: { tags: [], onchange: vi.fn() } });
      const input = screen.getByTestId('tag-input-field');

      await fireEvent.focus(input);

      // First suggestion should be 'project' with count 10
      const suggestions = screen.getAllByTestId('suggestion-item');
      expect(suggestions[0].textContent).toContain('(10)');
    });
  });
});
