import { useState } from "react";

export function useCopyToClipboard() {
	const [copied, setCopied] = useState(false);

	const copy = (text: string) => {
		navigator.clipboard.writeText(text);
		setCopied(true);
	};

	return { copied, copy };
}
