import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@xamsa/ui/components/field";
import { cn } from "@xamsa/ui/lib/utils";
import type React from "react";
import {
	Controller,
	type ControllerFieldState,
	type ControllerRenderProps,
	type FieldPath,
	type FieldValues,
	type UseFormStateReturn,
} from "react-hook-form";

interface FormInputProps<
	TFieldValues extends FieldValues = FieldValues,
	TFieldName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
	TTransformedValues = TFieldValues,
> extends Omit<
		React.ComponentProps<
			typeof Controller<TFieldValues, TFieldName, TTransformedValues>
		>,
		"render"
	> {
	label?: React.ReactNode;
	description?: string;

	fieldClassName?: string;
	labelClassName?: string;
	descriptionClassName?: string;
	errorClassName?: string;

	children: (
		field: ControllerRenderProps<TFieldValues, TFieldName>,
		fieldState: ControllerFieldState,
		formState: UseFormStateReturn<TFieldValues>,
	) => React.ReactElement;
}

export function FormInput<
	TFieldValues extends FieldValues = FieldValues,
	TFieldName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
	TTransformedValues = TFieldValues,
>({
	control,
	name,
	defaultValue,
	disabled,
	exact,
	rules,
	shouldUnregister,
	children,

	label,
	description,

	fieldClassName,
	labelClassName,
	descriptionClassName,
	errorClassName,
}: FormInputProps<TFieldValues, TFieldName, TTransformedValues>) {
	return (
		<Controller
			control={control}
			name={name}
			defaultValue={defaultValue}
			disabled={disabled}
			exact={exact}
			rules={rules}
			shouldUnregister={shouldUnregister}
			render={(props) => {
				return (
					<Field className={cn(fieldClassName)}>
						{label && (
							<FieldLabel className={labelClassName}>{label}</FieldLabel>
						)}
						{description && (
							<FieldDescription className={descriptionClassName}>
								{description}
							</FieldDescription>
						)}
						{children(props.field, props.fieldState, props.formState)}
						{props.fieldState.error?.message && (
							<FieldError className={errorClassName}>
								{props.fieldState.error.message}
							</FieldError>
						)}
					</Field>
				);
			}}
		/>
	);
}
