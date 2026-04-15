import {
	Dialog,
	DialogClose,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
	DialogTrigger,
} from "@xamsa/ui/components/dialog";
import {
	Drawer,
	DrawerClose,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerPanel,
	DrawerPopup,
	DrawerTitle,
	DrawerTrigger,
} from "@xamsa/ui/components/drawer";
import {
	type BreakpointQuery,
	type MediaQueryInput,
	useMediaQuery,
} from "@xamsa/ui/hooks/use-media-query";
import { cn } from "@xamsa/ui/lib/utils";
import type React from "react";

interface BetterDialogProps {
	opened?: boolean;
	setOpened?: (opened?: boolean | null) => void;

	title: string;
	description?: string;
	trigger?: React.ComponentProps<typeof DialogTrigger>["render"];

	renderClose?: boolean;
	close?: React.ComponentProps<typeof DrawerClose>["render"];
	submit?: React.ReactNode;
	children: React.ReactNode;

	showBar?: boolean;
	position?: React.ComponentProps<typeof Drawer>["position"];
	scrollable?: boolean;
	breakpoint?: BreakpointQuery | MediaQueryInput | (string & {});

	triggerClassName?: string;
	popupClassName?: string;
	headerClassName?: string;
	titleClassName?: string;
	descriptionClassName?: string;
	panelClassName?: string;
	footerClassName?: string;
	closeClassName?: string;
}

export function BetterDialog({
	opened,
	setOpened,
	title,
	description,
	trigger,
	renderClose = true,
	close,
	children,
	submit,
	scrollable = false,
	breakpoint = "max-md",
	showBar = false,
	position = "bottom",
	triggerClassName,
	popupClassName,
	headerClassName,
	titleClassName,
	descriptionClassName,
	panelClassName,
	footerClassName,
	closeClassName,
}: BetterDialogProps) {
	const isMobile = useMediaQuery(breakpoint);

	if (isMobile) {
		return (
			<Drawer open={opened} onOpenChange={setOpened}>
				{trigger && (
					<DrawerTrigger className={triggerClassName} render={trigger} />
				)}
				<DrawerPopup
					showBar={showBar}
					position={position}
					className={popupClassName}
				>
					{(title || description) && (
						<DrawerHeader className={headerClassName}>
							{title && (
								<DrawerTitle className={titleClassName}>{title}</DrawerTitle>
							)}
							{description && (
								<DrawerDescription className={descriptionClassName}>
									{description}
								</DrawerDescription>
							)}
						</DrawerHeader>
					)}
					<DrawerPanel scrollable={scrollable} className={panelClassName}>
						{children}
					</DrawerPanel>
					{(renderClose || submit) && (
						<DrawerFooter className={footerClassName}>
							{renderClose && (
								<DrawerClose className={closeClassName} render={close} />
							)}
							{submit}
						</DrawerFooter>
					)}
				</DrawerPopup>
			</Drawer>
		);
	}

	return (
		<Dialog open={opened} onOpenChange={setOpened}>
			{trigger && (
				<DialogTrigger render={trigger} className={triggerClassName} />
			)}
			<DialogPopup className={cn("sm:max-w-md", popupClassName)}>
				{(title || description) && (
					<DialogHeader className={headerClassName}>
						{title && (
							<DialogTitle className={titleClassName}>{title}</DialogTitle>
						)}
						{description && (
							<DialogDescription className={descriptionClassName}>
								{description}
							</DialogDescription>
						)}
					</DialogHeader>
				)}
				<DialogPanel className={panelClassName}>{children}</DialogPanel>
				{(renderClose || submit) && (
					<DialogFooter className={footerClassName}>
						<DialogClose className={closeClassName} render={close} />
						{submit}
					</DialogFooter>
				)}
			</DialogPopup>
		</Dialog>
	);
}
