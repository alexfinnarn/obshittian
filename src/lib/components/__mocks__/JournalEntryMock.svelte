<script lang="ts">
	interface Props {
		entry: {
			id: string;
			text: string;
		};
	}

	let { entry }: Props = $props();
</script>

<div data-testid={"journal-entry-" + entry.id}>{entry.text}</div>
