<script lang="ts">
let { siteTitle = "The Hive Mind", children } = $props();
</script>

<svelte:head>
    <title>{siteTitle}</title>
</svelte:head>
<div class="container mx-auto max-w-2xl px-4 py-8">
    <section class="prose prose-invert mb-8">
        <p>
            The Hive Guild'inin gizli defterine hoş geldin. Taktikler, bilgiler ve rehberler sana yolculuğunda yardımcı olacak. Raid için gerekenler, Boss bilgileri, hangi Addon'lar gibi soruların cevaplarıyla emrindeyim.
        </p>
        <p>
            Sol altta ya da sayfanın sonundaki ikonlara basarak daha fazla bilgi edinebileceğin sitelerin linklerini sakladım.
        </p>
    </section>

  {@render children()}
</div>
  <!-- Social Links -->
     <nav class="bottom-0 z-10
                 relative w-full md:left-10 md:fixed md:w-auto">
       <ul class="flex flex-row justify-center space-x-5 items-center
                  md:flex-col md:space-x-0 md:space-y-4">
         <li class="w-6">
           <a href="https://discord.gg/JRXv5XMZGy" target="_blank" title="Discord">
             <img src="/images/svgs/discord.svg" alt="discord" />
           </a>
         </li>
         <li class="w-6">
           <a href="https://www.archon.gg/wow/tier-list/dps-rankings/raid/heroic/all-bosses" title="Archon" target="_blank">
             <img src="/images/svgs/archon.svg" alt="archon" />
           </a>
         </li>
         <li class="w-6">
           <a href="https://lorrgs.io/" title="Lorrgs" target="_blank">
             <img alt="lorrgs" src="/images/lorrgs.jpg" />
           </a>
         </li>
         <li class="w-6">
           <a href="https://bloodmallet.com/" title="BloodMallet" target="blank">
             <img alt="bloodMallet" src="/images/svgs/bloodmallet.svg" />
           </a>
         </li>
         <li class="w-6">
           <a href="https://u.gg/wow" title="U.GG" target="blank">
             <img alt="u.gg" src="/images/svgs/u.svg" />
           </a>
         </li>
       </ul>
       <!-- Vertical line after social icons - only shows on md and up -->
       <div class="hidden md:block mt-4 h-24 w-px mx-auto bg-text/30"></div>
     </nav>
