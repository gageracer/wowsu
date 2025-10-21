<script>
	import { page } from '$app/state';

	const home = $derived(page.url.pathname === '/');
</script>

<!-- Social Links -->
<nav class={['mt-8 w-full md:left-10 md:w-auto', {'relative bottom-0 z-10 md:fixed': !home} ]}>
	<ul
		class={['flex flex-row items-center justify-center space-x-5',!home && 'md:flex-col md:space-y-4 md:space-x-0']}
	>
		<li class="w-6">
			<a href="https://discord.gg/JRXv5XMZGy" target="_blank" title="Discord">
				<img loading="lazy" src="/images/svgs/discord.svg" alt="discord" />
			</a>
		</li>
		<li class="w-6">
			<a
				href="https://www.archon.gg/wow/tier-list/dps-rankings/raid/heroic/all-bosses"
				title="Archon"
				target="_blank"
			>
				<img loading="lazy" src="/images/svgs/archon.svg" alt="archon" />
			</a>
		</li>
		<li class="w-6">
			<a href="https://lorrgs.io/" title="Lorrgs" target="_blank">
				<img loading="lazy" alt="lorrgs" src="/images/lorrgs.jpg" />
			</a>
		</li>
		<li class="w-6">
			<a href="https://bloodmallet.com/" title="BloodMallet" target="blank">
				<img loading="lazy" alt="bloodMallet" src="/images/svgs/bloodmallet.svg" />
			</a>
		</li>
		<li class="w-6">
			<a href="https://u.gg/wow" title="U.GG" target="blank">
				<img loading="lazy" alt="u.gg" src="/images/svgs/u.svg" />
			</a>
		</li>
		<li class="w-6">
			<a href="https://www.warcraftlogs.com/guild/id/469456" title="GuildWLogPage" target="blank">
				<img loading="lazy" alt="GuildWLogPage" src="/images/wlog.png" />
			</a>
		</li>
		<li class="w-6">
			<a href="https://wowchievement.com/" title="WowAchievement" target="blank">
				<img loading="lazy" alt="WowAchievement" src="/images/wowachivement.webp" />
			</a>
		</li>
		<li class="w-6">
			<a href="https://completionism.com/" title="Completionism" target="blank">
				<img loading="lazy" alt="Completionism" src="/images/ui_delves.jpg" />
			</a>
		</li>
	</ul>

	<!-- Vertical line after social icons - only shows on md and up -->
	{#if !home}
		<div class="mx-auto mt-4 hidden h-24 w-px bg-text/30 md:block"></div>
	{/if}
</nav>
