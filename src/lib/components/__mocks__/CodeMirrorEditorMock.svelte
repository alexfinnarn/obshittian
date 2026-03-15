<script lang="ts">
	interface Props {
		content?: string;
		onchange?: (content: string) => void;
	}

	let { content = '', onchange }: Props = $props();
</script>

<textarea
	data-testid="codemirror-editor-mock"
	value={content}
	oninput={(event) => onchange?.((event.currentTarget as HTMLTextAreaElement).value)}
></textarea>
