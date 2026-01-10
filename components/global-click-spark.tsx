"use client";

import ClickSpark from "@/components/react-bits/ClickSpark";

interface GlobalClickSparkProps {
	children: React.ReactNode;
}

export function GlobalClickSpark({ children }: GlobalClickSparkProps) {
	return (
		<div className="min-h-screen">
			<ClickSpark
				sparkColor="#a855f7"
				sparkSize={12}
				sparkRadius={25}
				sparkCount={8}
				duration={400}
				extraScale={1.5}
			>
				{children}
			</ClickSpark>
		</div>
	);
}