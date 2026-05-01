"use client";

import {
	Dialog,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
	DialogTrigger,
} from "@xamsa/ui/components/dialog";
import { cn } from "@xamsa/ui/lib/utils";
import type { ReactNode } from "react";

type ProfileImageLightboxProps = {
	/** Display name for alt text and dialog title */
	name: string;
	image?: string | null;
	initials: string;
	children: ReactNode;
	/** Extra classes on the native button trigger */
	triggerClassName?: string;
};

/** Opens a modal with a larger avatar (or initials) in a fixed square. Trigger must be the visual avatar only so surrounding links stay independent. */
export function ProfileImageLightbox({
	name,
	image,
	initials,
	children,
	triggerClassName,
}: ProfileImageLightboxProps) {
	const label = `View larger avatar of ${name}`;
	const src = image?.trim() ? image : null;

	return (
		<Dialog>
			<DialogTrigger
				aria-label={label}
				render={
					<button
						type="button"
						className={cn(
							"touch-manipulation rounded-md focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
							triggerClassName,
						)}
					/>
				}
			>
				{children}
			</DialogTrigger>
			<DialogPopup className="max-w-[min(calc(100vw-2rem),22rem)] sm:max-w-md">
				<DialogHeader className="sr-only">
					<DialogTitle>{name}</DialogTitle>
				</DialogHeader>
				<DialogPanel
					scrollFade={false}
					className="flex w-full flex-col items-center gap-4 pb-6"
				>
					{/* Fixed square viewport so photos and initials align consistently */}
					<div className="mx-auto aspect-square w-full max-w-[min(85vw,20rem)] overflow-hidden rounded-2xl border border-border bg-muted shadow-lg">
						{src ? (
							<img
								src={src}
								alt={`${name} — profile avatar`}
								className="size-full object-contain object-center"
							/>
						) : (
							<div
								className="flex size-full items-center justify-center bg-linear-to-br from-primary/25 to-primary/5 font-bold text-6xl text-primary"
								aria-hidden
							>
								{initials}
							</div>
						)}
					</div>
					<p className="text-center font-medium text-foreground">{name}</p>
				</DialogPanel>
			</DialogPopup>
		</Dialog>
	);
}
