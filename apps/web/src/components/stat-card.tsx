import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@xamsa/ui/components/card";

interface StatCardProps {
	value: string;
	icon?: React.ReactNode;
	label: string;
	sub?: string;
}

export function StatCard({ value, icon, label, sub }: StatCardProps) {
	return (
		<Card>
			<CardHeader className="items-center p-4 text-center">
				<CardDescription className="flex items-center gap-1.5">
					{icon}
					{label}
				</CardDescription>
				<CardTitle>{value}</CardTitle>
				{sub && <CardDescription className="text-xs">{sub}</CardDescription>}
			</CardHeader>
		</Card>
	);
}
