import { zodResolver } from "@hookform/resolvers/zod";
import { type ComponentProps, useMemo } from "react";
import {
	type FieldPath,
	type FieldValues,
	type UseFormProps,
	useForm,
} from "react-hook-form";
import type { z } from "zod";
import { FormInput } from "@/components/form-input";
import { LoadingButton } from "@/components/loading-button";

export function useAppForm<
	TFieldValues extends FieldValues,
	// biome-ignore lint/suspicious/noExplicitAny: context can be anything
	TContext = any,
	TTransformedValues = TFieldValues,
>(
	props: Omit<
		UseFormProps<TFieldValues, TContext, TTransformedValues>,
		"resolver"
	> & {
		schema: z.ZodType<TTransformedValues, TFieldValues>;
	},
) {
	const { schema, ...formProps } = props;

	const resolver = useMemo(
		() => zodResolver<TFieldValues, TContext, TTransformedValues>(schema),
		[schema],
	);

	const form = useForm<TFieldValues, TContext, TTransformedValues>({
		...formProps,
		resolver,
	});

	const AppFormInput = useMemo(() => {
		return <
			TFieldName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
		>(
			props: Omit<
				ComponentProps<
					typeof FormInput<TFieldValues, TFieldName, TTransformedValues>
				>,
				"control"
			>,
		) => <FormInput control={form.control} {...props} />;
	}, [form.control]);

	const AppFormSubmit = useMemo(() => {
		return (props: React.ComponentProps<typeof LoadingButton>) => (
			<LoadingButton
				isLoading={
					props.isLoading ||
					form.formState.isSubmitting ||
					form.formState.isValidating
				}
				loadingText="Working..."
				type="submit"
				{...props}
			/>
		);
	}, [form.formState.isSubmitting, form.formState.isValidating]);

	return {
		...form,
		Input: AppFormInput,
		Submit: AppFormSubmit,
	};
}
