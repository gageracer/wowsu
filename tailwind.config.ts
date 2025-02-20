import typography from "@tailwindcss/typography";
import type { Config } from "tailwindcss";

export default {
	content: ["./src/**/*.{html,js,svelte,ts}"],

	theme: {
		extend: {
		backgroundImage: {
        'leather': "url('/images/bg-leather.jpg')",
        'mobile': "url('/images/960_BG_Mobile.jpg')",
      },
		colors: {
						base: "#0D1532",      // Wow dark theme base color
						primary: "#22180f",    // Primary accent from Wow UI
						secondary: "#F8B700",   // Secondary accent from Wow UI
						accent: "#FFC8G7",     // Secondary text accent from Wow UI
						text: "#F8B700",       // Text color matching Wow UI
						section: "#1DPX5A",    // Section heading color
						primarySection: "#1B963D",// Primary section color
						secondarySection: "#81C745",// Secondary section color
						accentSection: "#FFA0D6"   // Accent section color
					},
		},
	},

	plugins: [typography],
} satisfies Config;
