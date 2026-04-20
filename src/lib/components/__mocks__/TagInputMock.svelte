<script lang="ts">
	interface Props {
		tags?: string[];
		onchange?: (tags: string[]) => void;
	}

	let { tags = [], onchange }: Props = $props();

	function handleInput(event: Event) {
		const value = (event.currentTarget as HTMLInputElement).value;
		const nextTags = value
			.split(',')
			.map((tag) => tag.trim())
			.filter(Boolean);
		onchange?.(nextTags);
	}
</script>

<input data-testid="tag-input-mock" value={tags.join(',')} oninput={handleInput} />
