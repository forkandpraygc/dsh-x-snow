window.__ModuleLoader__.load({
	id: "@local/dsh-x-snow",
	factory: () => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		/** Canvas id, so an HMR reload replaces the overlay instead of stacking. */
		const CANVAS_ID = "dsh-x-snow";
		/** Sprite cell size; every flake shape is pre-rendered once per theme. */
		const SPRITE_SIZE = 128;
		/** Upper bound for the backing store, so 4K + high DPR stays sane. */
		const MAX_CANVAS_PIXELS = 6000000;

		/** Snow tuning. Set enabled to false to remove the effect. */
		const SNOW = {
			enabled: true,
			density: 1,
			speed: 1,
			opacity: 0.9,
			minFlakes: 90,
			maxFlakes: 300,
		};

		/** Whether the current Harness theme is dark. */
		function prefersDark() {
			if (typeof document === "undefined") return true;
			if (document.documentElement.hasAttribute("data-ds-dark-theme")) return true;
			if (document.body != null && document.body.hasAttribute("data-ds-dark-theme")) return true;
			return (
				typeof window.matchMedia === "function" &&
				window.matchMedia("(prefers-color-scheme: dark)").matches
			);
		}

		/**
		 * Pre-render one snowflake variant. Five shapes cover the depth range:
		 * soft bokeh discs for the far plane, six-armed dendrites and plates for
		 * the near plane, simple stars in between, and tiny ice specks.
		 * @param kind - bokeh | dendrite | star | plate | speck.
		 * @param dark - pick light or dark-theme ink and glow.
		 * @returns the sprite canvas, or null when 2D canvas is unavailable.
		 */
		function makeSnowflakeSprite(kind, dark) {
			const sprite = document.createElement("canvas");
			sprite.width = SPRITE_SIZE;
			sprite.height = SPRITE_SIZE;
			if (typeof sprite.getContext !== "function") return null;
			const g = sprite.getContext("2d");
			if (g === null) return null;

			const center = SPRITE_SIZE / 2;
			const ink = "rgba(255,255,255,0.98)";
			const glow = dark ? "rgba(188,220,255,0.9)" : "rgba(92,124,172,0.85)";
			g.translate(center, center);

			if (kind === "bokeh") {
				const disc = g.createRadialGradient(0, 0, 0, 0, 0, 58);
				if (dark) {
					disc.addColorStop(0, "rgba(255,255,255,.07)");
					disc.addColorStop(0.5, "rgba(228,242,255,.06)");
					disc.addColorStop(0.8, "rgba(228,242,255,.48)");
					disc.addColorStop(0.94, "rgba(228,242,255,.2)");
					disc.addColorStop(1, "rgba(228,242,255,0)");
				} else {
					disc.addColorStop(0, "rgba(255,255,255,.16)");
					disc.addColorStop(0.5, "rgba(170,198,235,.08)");
					disc.addColorStop(0.8, "rgba(120,155,205,.5)");
					disc.addColorStop(0.94, "rgba(120,155,205,.2)");
					disc.addColorStop(1, "rgba(120,155,205,0)");
				}
				g.fillStyle = disc;
				g.beginPath();
				g.arc(0, 0, 58, 0, Math.PI * 2);
				g.fill();
				return sprite;
			}

			// A faint halo sells the "catching light" look around crisp flakes.
			const halo = g.createRadialGradient(0, 0, 0, 0, 0, 60);
			if (dark) {
				halo.addColorStop(0, "rgba(255,255,255,.12)");
				halo.addColorStop(0.55, "rgba(214,237,255,.05)");
				halo.addColorStop(1, "rgba(214,237,255,0)");
			} else {
				halo.addColorStop(0, "rgba(255,255,255,.22)");
				halo.addColorStop(0.55, "rgba(150,180,220,.07)");
				halo.addColorStop(1, "rgba(150,180,220,0)");
			}
			g.fillStyle = halo;
			g.beginPath();
			g.arc(0, 0, 60, 0, Math.PI * 2);
			g.fill();

			g.lineCap = "round";
			g.lineJoin = "round";
			g.strokeStyle = ink;
			g.fillStyle = ink;
			g.shadowColor = glow;
			g.shadowBlur = dark ? 8 : 5;

			const line = (x1, y1, x2, y2, width) => {
				g.lineWidth = width;
				g.beginPath();
				g.moveTo(x1, y1);
				g.lineTo(x2, y2);
				g.stroke();
			};
			const dot = (x, y, radius) => {
				g.beginPath();
				g.arc(x, y, radius, 0, Math.PI * 2);
				g.fill();
			};
			const hexPath = (radius) => {
				g.beginPath();
				for (let index = 0; index < 6; index += 1) {
					const angle = (index * Math.PI) / 3 - Math.PI / 6;
					const x = Math.cos(angle) * radius;
					const y = Math.sin(angle) * radius;
					if (index === 0) g.moveTo(x, y);
					else g.lineTo(x, y);
				}
				g.closePath();
			};

			if (kind === "dendrite") {
				for (let arm = 0; arm < 6; arm += 1) {
					g.save();
					g.rotate((arm * Math.PI) / 3);
					line(0, 8, 0, 54, 4.6);
					for (const at of [0.34, 0.54, 0.74]) {
						const y = 8 + (54 - 8) * at;
						const length = (1 - at) * 17 + 5;
						line(0, y, -length * 0.8, y + length * 0.6, 3);
						line(0, y, length * 0.8, y + length * 0.6, 3);
						dot(-length * 0.8, y + length * 0.6, 2.2);
						dot(length * 0.8, y + length * 0.6, 2.2);
					}
					dot(0, 55, 3.2);
					g.restore();
				}
				dot(0, 0, 3.4);
			} else if (kind === "star") {
				for (let arm = 0; arm < 6; arm += 1) {
					g.save();
					g.rotate((arm * Math.PI) / 3);
					line(0, 6, 0, 52, 4.4);
					line(0, 28, -8, 37, 2.6);
					line(0, 28, 8, 37, 2.6);
					dot(0, 53, 2.8);
					g.restore();
				}
				dot(0, 0, 3.2);
			} else if (kind === "plate") {
				g.lineWidth = 4.2;
				hexPath(52);
				g.stroke();
				g.lineWidth = 2.6;
				hexPath(30);
				g.stroke();
				g.globalAlpha = 0.14;
				hexPath(30);
				g.fill();
				g.globalAlpha = 1;
				for (let arm = 0; arm < 6; arm += 1) {
					g.save();
					g.rotate((arm * Math.PI) / 3);
					line(0, 30, 0, 52, 3);
					dot(0, 53, 2.6);
					g.restore();
				}
				dot(0, 0, 2.8);
			} else {
				// Fine ice speck: a four-point sparkle rather than a round dot.
				line(0, 3, 0, 24, 4.2);
				line(0, -3, 0, -24, 4.2);
				line(3, 0, 24, 0, 4.2);
				line(-3, 0, -24, 0, 4.2);
				line(2, 2, 11, 11, 2.4);
				line(-2, 2, -11, 11, 2.4);
				line(2, -2, 11, -11, 2.4);
				line(-2, -2, -11, -11, 2.4);
				dot(0, 0, 3.2);
			}

			g.shadowBlur = 0;
			return sprite;
		}

		/** Pre-render the whole shape set for one theme. */
		function makeSprites(dark) {
			const kinds = ["bokeh", "dendrite", "star", "plate", "speck"];
			const set = {};
			for (const kind of kinds) {
				const sprite = makeSnowflakeSprite(kind, dark);
				if (sprite === null) return null;
				set[kind] = sprite;
			}
			return set;
		}

		/**
		 * Mount the full-window snow canvas. The canvas is fixed above the app,
		 * transparent to pointer events, and removed with the plugin effect.
		 * @returns cleanup for the animation, canvas, and listeners.
		 */
		function mountSnow() {
			if (!SNOW.enabled) return () => {};
			if (typeof document === "undefined" || document.body == null) return () => {};
			if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
				return () => {};
			}
			if (typeof document.getElementById !== "function") return () => {};

			const stale = document.getElementById(CANVAS_ID);
			if (stale !== null) stale.remove();

			const canvas = document.createElement("canvas");
			canvas.id = CANVAS_ID;
			canvas.setAttribute("aria-hidden", "true");
			Object.assign(canvas.style, {
				position: "fixed",
				inset: "0",
				width: "100%",
				height: "100%",
				pointerEvents: "none",
				zIndex: "2147483000",
				opacity: "0",
				transition: "opacity 650ms ease",
			});
			if (typeof canvas.getContext !== "function") return () => {};
			const g = canvas.getContext("2d");
			if (g === null) return () => {};

			let width = Math.max(1, window.innerWidth);
			let height = Math.max(1, window.innerHeight);
			let dpr = 1;
			let dark = prefersDark();
			let sprites = makeSprites(dark);
			if (sprites === null) return () => {};

			const flakes = [];
			const reducedQuery =
				typeof window.matchMedia === "function"
					? window.matchMedia("(prefers-reduced-motion: reduce)")
					: { matches: false };
			let animate = !reducedQuery.matches;
			let elapsed = 0;
			let frame = 0;
			let last = 0;

			const makeFlake = (initial) => {
				const layer = Math.random();
				let shape;
				if (layer < 0.34) shape = Math.random() < 0.72 ? "bokeh" : "speck";
				else if (layer < 0.7) shape = Math.random() < 0.55 ? "star" : "plate";
				else shape = Math.random() < 0.62 ? "dendrite" : "star";

				let radius;
				if (shape === "bokeh") radius = 2.2 + Math.random() * 3.2;
				else if (shape === "speck") radius = 0.7 + Math.random() * 1;
				else if (shape === "dendrite") radius = 3 + Math.random() * 3.2;
				else if (shape === "plate") radius = 1.8 + Math.random() * 2.2;
				else radius = 1.8 + Math.random() * 2.4;

				const size = shape === "bokeh" ? radius * 4 : radius * 3.4;
				const alpha =
					(0.26 + layer * 0.64) *
					SNOW.opacity *
					(shape === "bokeh" ? 0.82 : 1) *
					(shape === "speck" ? 1.15 : 1);

				return {
					x: Math.random() * width,
					y: initial ? Math.random() * height : -size,
					shape,
					size,
					layer,
					radius,
					speed: (14 + radius * 8) * (0.6 + layer * 0.8) * SNOW.speed,
					swayAmp: 4 + layer * 14,
					swaySpeed: 0.35 + Math.random() * 0.9,
					phase: Math.random() * Math.PI * 2,
					alpha: Math.min(1, alpha),
					angle: Math.random() * Math.PI * 2,
					spin:
						shape === "bokeh"
							? 0
							: (Math.random() < 0.5 ? -1 : 1) * (0.15 + layer * 0.85),
					vx: 0,
					vy: 0,
				};
			};

			const resetFlakes = () => {
				flakes.length = 0;
				const area = width * height;
				const raw = Math.round((area / 10000) * SNOW.density);
				const count = Math.max(SNOW.minFlakes, Math.min(SNOW.maxFlakes, raw));
				for (let index = 0; index < count; index += 1) {
					flakes.push(makeFlake(true));
				}
				flakes.sort((left, right) => left.layer - right.layer);
			};

			const draw = () => {
				g.clearRect(0, 0, width, height);
				const t = elapsed;

				for (const flake of flakes) {
					const sprite = sprites[flake.shape];
					if (sprite === undefined) continue;

					const twinkle = 0.82 + 0.18 * Math.sin(t * 1.6 + flake.phase);
					let alpha = flake.alpha * twinkle;
					if (flake.shape !== "bokeh") {
						const glint = Math.pow(
							Math.max(0, Math.sin(t * 0.85 + flake.phase * 2.3)),
							18,
						);
						alpha += glint * 0.35;
					}
					alpha = Math.min(1, Math.max(0, alpha));
					if (alpha < 0.01) continue;

					const size = flake.size;
					if (flake.shape === "bokeh") {
						g.globalAlpha = alpha;
						g.drawImage(sprite, flake.x - size / 2, flake.y - size / 2, size, size);
						continue;
					}

					// Near crisp flakes get a faint motion-blur ghost.
					if (flake.layer > 0.72 && size > 5) {
						g.save();
						g.globalAlpha = alpha * 0.16;
						g.translate(flake.x - flake.vx * 0.03, flake.y - flake.vy * 0.03);
						g.rotate(flake.angle - flake.spin * 0.03);
						g.drawImage(sprite, -size * 0.46, -size * 0.46, size * 0.92, size * 0.92);
						g.restore();
					}

					g.save();
					g.translate(flake.x, flake.y);
					g.rotate(flake.angle);
					g.globalAlpha = alpha;
					g.drawImage(sprite, -size / 2, -size / 2, size, size);
					g.restore();
				}

				g.globalAlpha = 1;
				if (canvas.style.opacity !== "1") canvas.style.opacity = "1";
			};

			const update = (dt) => {
				elapsed += dt;
				const t = elapsed;
				const wind =
					10 +
					Math.sin(t * 0.22) * 6 +
					Math.sin(t * 0.07 + 1.3) * 5 +
					Math.pow(Math.max(0, Math.sin(t * 0.09 + 0.7)), 6) * 28;

				for (const flake of flakes) {
					const sway =
						Math.sin(t * flake.swaySpeed + flake.phase) * flake.swayAmp +
						Math.sin(t * flake.swaySpeed * 2.3 + flake.phase * 1.7) *
							flake.swayAmp *
							0.35;
					flake.vx = wind * (0.25 + flake.layer * 0.9) + sway;
					flake.vy = flake.speed * (0.82 + 0.28 * Math.sin(t * 0.8 + flake.phase * 2));
					flake.x += flake.vx * dt;
					flake.y += flake.vy * dt;
					flake.angle += flake.spin * dt;

					if (flake.y > height + flake.size) {
						flake.y = -flake.size;
						flake.x = Math.random() * width;
						flake.phase = Math.random() * Math.PI * 2;
					}
					const margin = flake.size;
					if (flake.x < -margin) flake.x = width + margin;
					else if (flake.x > width + margin) flake.x = -margin;
				}
			};

			const tick = (now) => {
				frame = 0;
				if (!animate) return;
				const dt = last === 0 ? 0 : Math.min(0.05, (now - last) / 1000);
				last = now;
				if (dt > 0) update(dt);
				draw();
				frame = window.requestAnimationFrame(tick);
			};

			const start = () => {
				if (frame === 0) {
					last = 0;
					frame = window.requestAnimationFrame(tick);
				}
			};

			const stop = () => {
				if (frame !== 0) {
					window.cancelAnimationFrame(frame);
					frame = 0;
				}
			};

			const resize = () => {
				width = Math.max(1, window.innerWidth);
				height = Math.max(1, window.innerHeight);
				const area = width * height;
				const cap = Math.min(1.5, Math.sqrt(MAX_CANVAS_PIXELS / area));
				dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, cap));
				canvas.width = Math.round(width * dpr);
				canvas.height = Math.round(height * dpr);
				g.setTransform(dpr, 0, 0, dpr, 0, 0);
				resetFlakes();
				draw();
			};

			const refreshTheme = () => {
				const next = prefersDark();
				if (next === dark) return;
				const nextSprites = makeSprites(next);
				if (nextSprites === null) return;
				dark = next;
				sprites = nextSprites;
				draw();
			};

			const onReducedChange = () => {
				const next = !reducedQuery.matches;
				if (next === animate) return;
				animate = next;
				if (animate) start();
				else {
					stop();
					draw();
				}
			};

			const onResize = () => resize();
			window.addEventListener("resize", onResize);

			const themeObserver = new MutationObserver(refreshTheme);
			for (const target of [document.documentElement, document.body]) {
				if (target === null || target === undefined) continue;
				themeObserver.observe(target, {
					attributes: true,
					attributeFilter: ["class", "style", "data-ds-dark-theme", "data-ds-theme-source"],
				});
			}

			const mediaDark =
				typeof window.matchMedia === "function"
					? window.matchMedia("(prefers-color-scheme: dark)")
					: null;
			if (mediaDark !== null && typeof mediaDark.addEventListener === "function") {
				mediaDark.addEventListener("change", refreshTheme);
			}
			if (typeof reducedQuery.addEventListener === "function") {
				reducedQuery.addEventListener("change", onReducedChange);
			}

			document.body.appendChild(canvas);
			resize();
			if (animate) start();

			return () => {
				stop();
				window.removeEventListener("resize", onResize);
				themeObserver.disconnect();
				if (mediaDark !== null && typeof mediaDark.removeEventListener === "function") {
					mediaDark.removeEventListener("change", refreshTheme);
				}
				if (typeof reducedQuery.removeEventListener === "function") {
					reducedQuery.removeEventListener("change", onReducedChange);
				}
				flakes.length = 0;
				canvas.remove();
			};
		}

		/**
		 * Register the snow overlay with the client root context.
		 * @param ctx - client root context.
		 */
		function apply(ctx) {
			ctx.effect(() => {
				try {
					return mountSnow();
				} catch (error) {
					console.warn("x-snow: snow disabled", error);
					return () => {};
				}
			}, "x-snow: full-screen snowfall");
		}

		exports.apply = apply;
		exports.SNOW = SNOW;
		exports.CANVAS_ID = CANVAS_ID;
		return module.exports;
	},
});
