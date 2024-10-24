export const notePreviewRender = (noteInfo: NoteRenderType) => {

    const title = noteInfo.title
    const summary = noteInfo.summary
    const thumbnail = noteInfo.thumbnail
    const sharableLink = noteInfo.sharableLink

    // Generate the dynamic HTML content with meta tags
    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <link href="/output.css" rel="stylesheet">
            <link rel="icon" href="/favicon.ico" type="image/x-icon">

            <!-- Open Graph Meta Tags -->
            <meta property="og:title" content="${title}">
            <meta property="og:description" content="${summary}">
            <meta property="og:image" content="${thumbnail}">
            <meta property="og:url" content="${sharableLink}">
            <meta property="og:type" content="website">
            <meta property="og:site_name" content="Ninaiva: Learning Partner">

            <!-- Twitter Card Meta Tags -->
            <meta name="twitter:card" content="summary_large_image">
            <meta name="twitter:title" content="${title}">
            <meta name="twitter:description" content="${summary}">
            <meta name="twitter:image" content="${thumbnail}">
            <meta name="twitter:site" content="@yourTwitterHandle">
        </head>
        <body>
            <nav class="fixed top-0 w-full bg-white border-b dark:bg-gray-800 z-10">
                <div class="container px-6 py-4 mx-auto">
                    <a href="/">
                        <img src="/assets/ninaiva-learning-partner-logo.svg" alt="App Logo" class="w-auto h-10">
                    </a>
                </div>
            </nav>
            <div class="container mx-auto px-6 py-10 mt-8">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <img src="${thumbnail}" alt="Note Thumbnail" class="bg-slate-100 mt-4 rounded">
                        <h1 class="text-2xl font-bold py-4">${title}</h1>
                        <p>${summary}</p>
                    </div>
                    <div class="hidden md:flex items-center justify-center h-[80vh]">
                        <div class="flex-col items-center justify-center text-center">
                            <div id="qr" style="width: 300px; height: 300px" class="bg-slate-100 mb-8"></div>
                            <a href="${sharableLink}" class="bg-slate-100 m-3 p-2 rounded-2xl">See full note in Ninaiva app</a>
                        </div>
                    </div>
                </div>
            </div>
            	<!-- Button for Mobile View -->
		<div
			id="android-item"
			class="flex items-end justify-center h-[30vh] fixed bottom-0 left-0 w-full p-4 text-white bg-gradient-to-b from-transparent to-[#0374F9] md:hidden"
		>
			<!-- S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dapp.dfeverx.ninaiva -->
			<a
				id="link-to-app"
				class="bg-white text-center text-black w-full p-4 rounded-lg"
				href="intent://learning-partner.web.app/${sharableLink}#Intent;scheme=https;package=app.dfeverx.ninaiva;end"
			>
				Open on <b>Ninaiva</b>
			</a>
		</div>
          <script
			type="text/javascript"
			src="https://unpkg.com/qr-code-styling@1.5.0/lib/qr-code-styling.js"
		></script>
		<img src="" alt="" />
		<script type="text/javascript">
			const qrCode = new QRCodeStyling({
				width: 300,
				height: 300,
				type: "svg",
				data: "https://www.facebook.com/",
				image: "./android-chrome-192x192.png",
				dotsOptions: {
					color: "#black",
					type: "extra-rounded",
				},
				backgroundOptions: {
					color: "#ffffff",
				},
				imageOptions: {
					crossOrigin: "anonymous",
					margin: 20,
				},
			});

			qrCode.append(document.getElementById("qr"));
			// qrCode.download({ name: "qr", extension: "svg" });

			const mobLink = document.getElementById("link-to-app");
			const deskLink = document.getElementById("desk-link");

			const userAgent = navigator.userAgent.toLowerCase();

			if (!userAgent.includes("android")) {
				mobLink.href =
					"https://play.google.com/store/apps/details?id=app.dfeverx.ninaiva";
				deskLink.href =
					"https://play.google.com/store/apps/details?id=app.dfeverx.ninaiva";
			}
		</script>
        </body>
        </html>
    `;
    return htmlContent
}

interface NoteRenderType {
    title: string,
    summary: string,
    thumbnail: string,
    sharableLink: string
}