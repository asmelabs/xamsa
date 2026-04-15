import { Button } from "@xamsa/ui/components/button";

interface LoadingButtonProps extends React.ComponentProps<typeof Button> {
	isLoading?: boolean;
	loadingText?: string;
}

export function LoadingButton({
	isLoading,
	loadingText = "Loading...",
	...props
}: LoadingButtonProps) {
	return (
		<Button {...props} disabled={isLoading || props.disabled}>
			{isLoading ? loadingText : props.children}
		</Button>
	);
}
