<script lang="ts">
	interface Props {
		item: {
			id: string;
			text: string;
		};
	}

	let { item }: Props = $props();
</script>

<div data-testid={"task-item-" + item.id}>{item.text}</div>
