import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { signal, effect, computed } from '@preact/signals';
import { temporarySignal, persistentSignal } from './lib/persistent-signal.js';
import classNames from 'classnames';
import GoogleFonts from './google-fonts-minimal.json';
import LocalFonts from './local-fonts.json';

const text = temporarySignal('text', 'Hello, Avatar!');
const color = temporarySignal('color', '#FFFFFF');
const fontWeight = temporarySignal('fontWeight', 400);
const fontFamily = temporarySignal('fontFamily', 'Iceland');
const fontEmbedState = signal('none'); // 'none' | 'loading' | 'loaded' | 'error'
const fontSize = temporarySignal('fontSize', 32);
const fontEmbed = temporarySignal('fontEmbed', fontFamily.value !== 'system-ui'? fontFamily.value.replace(/ /g, '+') : null);
const textureStats = signal({ width: 0, height: 0 });
const textureMarquee = temporarySignal('textureMarquee', false);
const textureFixedWidth = temporarySignal('textureFixedWidth', false);
const textureFixedHeight = temporarySignal('textureFixedHeight', false);
const textureStableBaseline = temporarySignal('textureStableBaseline', false);


function debounce(fn, delay) {
	let timeoutId;
	return function(...args) {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn(...args), delay);
	};
}

export function App() {
	const canvasRef = useRef(null);
	const anchorRef = useRef(null);
	const [downloadURL, setDownloadURL] = useState(null);
	const [filename, setFilename] = useState('text.png');
	
	useEffect(async () => {
		const ctx = canvasRef.current.getContext('2d');
		const font = `${fontWeight.value} ${fontSize.value}px ${fontFamily.value}, sans-serif`;
		ctx.font = font;
		await document.fonts.load(ctx.font);
		if(fontEmbedState.value !== 'loaded') fontEmbedState.value = 'loaded';
		
		let lines = text.value.split('\n');
		const isMultiline = lines.length > 1;
		
		ctx.font = font;
		let maxWidth = 0;
		for(let line of lines) {
			const measure = ctx.measureText(line);
			if(measure.width > maxWidth) maxWidth = measure.width;
		}
		ctx.canvas.width = Math.ceil(maxWidth) * (textureMarquee.value? 2 : 1);
		
		
		// ctx.font = font;
		let lineGap = fontSize.value * 0.2;
		let lineHeight = fontSize.value * 1.2;
		let offset;
		
		if(textureStableBaseline.value)
		{
			ctx.font = font;
			const measure = ctx.measureText('Sample');
			ctx.canvas.height = isMultiline?
				Math.ceil(lineHeight * lines.length):
				Math.ceil(measure.fontBoundingBoxAscent + measure.fontBoundingBoxDescent);
			
			offset = measure.fontBoundingBoxAscent;
		}
		
		else
		{
			ctx.font = font;
			const measure = ctx.measureText(text.value);
			lineHeight = (measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent) + 4;
			ctx.canvas.height = isMultiline?
				Math.ceil(lineHeight * lines.length):
				Math.ceil(measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent);
			
			offset = measure.actualBoundingBoxAscent;
		}
		
		if(textureFixedHeight.value)
		{
			let height = Math.pow(2, Math.ceil(Math.log2(ctx.canvas.height)))
			offset += (height - ctx.canvas.height) / 2; // center text
			ctx.canvas.height = height;
		}
		if(textureFixedWidth.value) ctx.canvas.width = Math.pow(2, Math.ceil(Math.log2(ctx.canvas.width)));
		
		ctx.canvas.style.aspectRatio = `${ctx.canvas.width} / ${ctx.canvas.height}`;
		textureStats.value = { width: ctx.canvas.width, height: ctx.canvas.height };
		
		ctx.fillStyle = color.value;
		ctx.font = font;
		for(let line of lines)
		{
			ctx.fillText(line, 0, offset);
			offset += lineHeight;
		}
		
		canvasRef.current.toBlob(blob => {
			const url = URL.createObjectURL(blob);
			if(downloadURL) URL.revokeObjectURL(downloadURL);
			setDownloadURL(url);
			setFilename(`text-${
				text.value
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-+|-+$/g, '')
				.split('-')
				.slice(0, 5)
				.join('-')
			}.png`);
		});
	}, [
		canvasRef.current,
		text.value,
		color.value,
		fontWeight.value,
		fontFamily.value,
		fontSize.value,
		fontEmbedState.value,
		textureMarquee.value,
		textureFixedHeight.value,
		textureFixedWidth.value,
		textureStableBaseline.value,
	]);
	
	return (
		<>
			<form class="config">
				<label class="field field-text">
					<div class="label">Text</div>
					{/* <input type="text" value={text.value} onInput={useCallback(debounce(e => text.value = e.target.value, 20), [])} /> */}
					<textarea value={text.value} onInput={useCallback(debounce(e => text.value = e.target.value, 20), [])} rows={Math.max(1, text.value.split('\n').length)} style={{ fontFamily: fontFamily.value }} />
				</label>
				<fieldset>
					<legend>Font</legend>
					<label class={classNames("field field-font-family", `is-${fontEmbedState.value}`)}>
						<div class="label">Font Family</div>
						<input type="text" value={fontFamily.value} onInput={useCallback(debounce(e => {
							let value = e.target.value.trim();
							if(!value) return;
							
							// Known font family
							if(!(value in GoogleFonts) && !LocalFonts.includes(value) && value !== 'system-ui') return;
							
							// Update font
							fontFamily.value = value;
							
							// Embed font for loading
							if(value in GoogleFonts) {
								fontEmbed.value = value.replace(/ /g, '+');
								fontEmbedState.value = 'loading';
							} else {
								fontEmbed.value = null;
								fontEmbedState.value = 'loaded';
							}
						}, 600), [])} list="font-family-options"/>
						<datalist id="font-family-options">
							<optgroup label="System">
								<option value="system-ui">system-ui</option>
							</optgroup>
							<optgroup label="Local">
								{LocalFonts.map(font => (
									<option value={font} key={font}>{font}</option>
								))}
							</optgroup>
							<optgroup label="Google">
								{Object.keys(GoogleFonts).filter(font => !font.startsWith('__')).map(font => (
									<option value={font} key={font}>{font}</option>
								))}
							</optgroup>
						</datalist>
					</label>
					<label class="field field-font-size">
						<div class="label">Font Size</div>
						<input
							type="number"
							value={fontSize.value}
							min="1"
							max="256"
							onInput={useCallback(debounce(e => fontSize.value = Math.min(Math.max(parseInt(e.target.value || '32', 10), 1), 256), 60), [])}
						/>
					</label>
					<label class="field field-font-weight">
						<div class="label">Font Weight</div>
						<input
							type="number"
							value={fontWeight.value}
							min="100"
							max="900"
							step="100"
							onInput={useCallback(debounce(e => fontWeight.value = Math.min(Math.max(parseInt(e.target.value || '400', 10), 100), 900), 120), [])}
						/>
					</label>
					<label class="field field-color">
						<div class="label">Color</div>
						<input type="color" value={color.value} onInput={e => color.value = e.target.value} />
					</label>
				</fieldset>
				<fieldset>
					<legend>Texture Output</legend>
					<label class="field field-marquee">
						<input type="checkbox" checked={textureMarquee.value} onInput={e => textureMarquee.value = e.target.checked} /> Double texture width
					</label>
					<label class="field field-fixed">
						<input type="checkbox" checked={textureFixedWidth.value} onInput={e => textureFixedWidth.value = e.target.checked} /> Fixed texture width
					</label>
					<label class="field field-fixed">
						<input type="checkbox" checked={textureFixedHeight.value} onInput={e => textureFixedHeight.value = e.target.checked} /> Fixed texture height
					</label>
					<label class="field field-stable">
						<input type="checkbox" checked={textureStableBaseline.value} onInput={e => textureStableBaseline.value = e.target.checked} /> Stable baseline
					</label>
				</fieldset>
			</form>
			<canvas class="texture" ref={canvasRef}/>
			<div class="stats">
				{`Texture Size: ${textureStats.value.width}×${textureStats.value.height}`}
			</div>
			<a
				class="download"
				download={filename}
				href={downloadURL}
				ref={anchorRef}
			>
				Download <span class="filename">{filename}</span>
			</a>
			
			{fontEmbed.value && fontEmbed.value in GoogleFonts && (
				<style>
					{Object.entries(GoogleFonts[fontEmbed.value])
					.map(([variant, weights]) => Object.entries(weights).map(([weight, url]) => {
						return `
							@font-face {
								font-family: '${fontFamily.value}';
								src: url('${GoogleFonts.__ENDPOINT}${url}') format('woff2');
								font-weight: ${weight};
								font-style: ${variant};
							}
						`;
					}).join('\n')).join('\n')}
				</style>
			)}
			
			{/* {fontEmbed.value && (
				<link
					rel="stylesheet"
					href={`https://fonts.googleapis.com/css2?family=${fontEmbed.value}`}
					onload={() => fontEmbedState.value = 'loaded'}
					onError={() => fontEmbedState.value = 'error'}
				/>
			)} */}
		</>
	)
}
