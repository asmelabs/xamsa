"use client";

import { Button } from "@xamsa/ui/components/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@xamsa/ui/components/input-group";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import type React from "react";
import { type HTMLInputTypeAttribute, useState } from "react";

interface PasswordInputProps
	extends Omit<React.ComponentProps<typeof InputGroupInput>, "type"> {
	enabled?: boolean;

	visibleType?: Exclude<HTMLInputTypeAttribute, "password">;
	hiddenType?: HTMLInputTypeAttribute;

	icons?: {
		visible?: React.ReactNode;
		hidden?: React.ReactNode;
	};

	groupClassName?: string;
	addonClassName?: string;
	addonAlign?: React.ComponentProps<typeof InputGroupAddon>["align"];
	buttonClassName?: string;
	buttonVariant?: React.ComponentProps<typeof Button>["variant"];
	buttonType?: React.ComponentProps<typeof Button>["type"];
	buttonSize?: React.ComponentProps<typeof Button>["size"];

	iconClassName?: string;

	children?: React.ReactNode;

	onVisibleToggle?: (visible: boolean) => void;
}

export function PasswordInput({
	enabled = true,
	icons,
	visibleType = "text",
	hiddenType = "password",
	groupClassName,
	addonClassName,
	addonAlign = "inline-end",
	buttonClassName,
	buttonVariant = "ghost",
	buttonType = "button",
	buttonSize = "icon",
	iconClassName,
	children,
	onVisibleToggle,
	...props
}: PasswordInputProps) {
	const [visible, setVisible] = useState(false);

	const type = !enabled ? hiddenType : visible ? visibleType : hiddenType;
	const icon = visible
		? (icons?.visible ?? <EyeIcon className={iconClassName} />)
		: (icons?.hidden ?? <EyeOffIcon className={iconClassName} />);

	const handleVisibleToggle = () => {
		setVisible(!visible);
		onVisibleToggle?.(!visible);
	};

	return (
		<InputGroup className={groupClassName}>
			<InputGroupInput type={type} {...props} />
			{enabled && (
				<InputGroupAddon
					tabIndex={-1}
					align={addonAlign}
					className={addonClassName}
				>
					<Button
						tabIndex={-1}
						type={buttonType}
						size={buttonSize}
						onClick={handleVisibleToggle}
						variant={buttonVariant}
						className={buttonClassName}
					>
						{icon}
					</Button>
				</InputGroupAddon>
			)}
			{children}
		</InputGroup>
	);
}
