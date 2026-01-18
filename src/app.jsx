import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { signal, effect, computed } from '@preact/signals';
import { temporarySignal, persistentSignal } from './lib/persistent-signal.js';
import classNames from 'classnames';

const text = temporarySignal('text', 'Hello, Avatar!');
const color = temporarySignal('color', '#FFFFFF');
const fontWeight = temporarySignal('fontWeight', 400);
const fontFamily = temporarySignal('fontFamily', 'Iceland');
const fontEmbedState = signal('none'); // 'none' | 'loading' | 'loaded' | 'error'
const fontSize = temporarySignal('fontSize', 32);
const fontEmbed = temporarySignal('fontEmbed', fontFamily.value !== 'system-ui'? fontFamily.value.replace(/ /g, '+') : null);
const textureStats = signal({ width: 0, height: 0 });
const textureMarquee = temporarySignal('textureMarquee', false);

function debounce(fn, delay) {
	let timeoutId;
	return function(...args) {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn(...args), delay);
	};
}

export function App() {
	const canvasRef = useRef(null);
	
	useEffect(async () => {
		if(fontEmbedState.value !== 'loaded') return;
		
		const ctx = canvasRef.current.getContext('2d');
		const font = `${fontWeight.value} ${fontSize.value}px ${fontFamily.value}, sans-serif`;
		ctx.font = font;
		await document.fonts.load(ctx.font);
		let measure = ctx.measureText(text.value);
		ctx.canvas.width = Math.ceil(measure.width) * (textureMarquee.value? 2 : 1);
		ctx.canvas.height = Math.ceil(measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent);
		ctx.canvas.style.aspectRatio = `${ctx.canvas.width} / ${ctx.canvas.height}`;
		textureStats.value = { width: ctx.canvas.width, height: ctx.canvas.height };
		ctx.fillStyle = color.value;
		ctx.font = font;
		ctx.fillText(text.value, 0, Math.ceil(measure.actualBoundingBoxAscent));
	}, [
		canvasRef.current,
		text.value,
		color.value,
		fontWeight.value,
		fontFamily.value,
		fontSize.value,
		fontEmbedState.value,
		textureMarquee.value,
	]);
	
	return (
		<>
			<form class="config">
				<label class="field field-text">
					<div class="label">Text</div>
					<input type="text" value={text.value} onInput={useCallback(debounce(e => text.value = e.target.value, 20), [])} />
				</label>
				<label class={classNames("field field-font-family", `is-${fontEmbedState.value}`)}>
					<div class="label">Font Family</div>
					<input type="text" value={fontFamily.value} onInput={useCallback(debounce(e => {
						fontFamily.value = e.target.value;
						if (e.target.value !== 'system-ui') {
							fontEmbed.value = e.target.value.replace(/ /g, '+');
							fontEmbedState.value = 'loading';
						} else {
							fontEmbed.value = null;
							fontEmbedState.value = 'loaded';
						}
					}, 600), [])}/>
				</label>
				<label class="field field-font-size">
					<div class="label">Font Size</div>
					<input
						type="number"
						value={fontSize.value}
						min="1"
						max="64"
						onInput={useCallback(debounce(e => fontSize.value = Math.min(Math.max(parseInt(e.target.value, 10), 1), 64), 60), [])}
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
						onInput={useCallback(debounce(e => fontWeight.value = parseInt(e.target.value, 10), 120), [])}
					/>
				</label>
				<label class="field field-color">
					<div class="label">Color</div>
					<input type="color" value={color.value} onInput={e => color.value = e.target.value} />
				</label>
				<label class="field field-marquee">
					<div class="label">Marquee</div>
					<input type="checkbox" checked={textureMarquee.value} onInput={e => textureMarquee.value = e.target.checked} /> Double Texture Width for using as a scrollable marquee
				</label>
			</form>
			<canvas class="texture" ref={canvasRef}/>
			<div class="stats">
				{`Texture Size: ${textureStats.value.width}×${textureStats.value.height}`}
			</div>
			
			{fontEmbed.value && (
				<link
					rel="stylesheet"
					href={`https://fonts.googleapis.com/css2?family=${fontEmbed.value}`}
					onload={() => fontEmbedState.value = 'loaded'}
					onError={() => fontEmbedState.value = 'error'}
				/>
			)}
		</>
	)
}
