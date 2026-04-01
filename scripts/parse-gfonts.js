import { readFile, writeFile, mkdir, access, unlink } from 'fs/promises';

const complete = JSON.parse(await readFile('.google-fonts-complete.json', 'utf8'));
const minimal = {
	__ENDPOINT: 'https://fonts.gstatic.com/s/'
};

for(const [family, familyData] of Object.entries(complete))
{
	let minimalVariants = minimal[family] || (minimal[family] = {});
	for(const [variant, weights] of Object.entries(familyData.variants))
	{
		let minimalWeights = minimalVariants[variant] || (minimalVariants[variant] = {});
		for(const [weight, assets] of Object.entries(weights))
		{
			let url = assets.url.woff2 || assets.url.woff || assets.url.ttf;
			url = url.replace(minimal.__ENDPOINT, '');
			minimalWeights[weight] = url;
		}
	}
}

await writeFile('src/google-fonts-minimal.json', JSON.stringify(minimal, null, '\t'), 'utf8');
console.log('Written to src/google-fonts-minimal.json');
