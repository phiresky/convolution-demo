declare var JXG: any, MathJax: any;
import * as React from "react";
import * as ReactDOM from "react-dom";
import 'bootstrap';
import 'bootstrap/css/bootstrap.css!';
import * as $ from "jquery";

JXG.Options.text.fontSize = 16;
const defaultConfig = {
	leftFn: "Triangle", rightFn: "Square",
	defaultConfig: { strokewidth: 3, withLabel: true, highlightStrokeColor: null as string },
	leftConfig: { strokecolor: "#ff0000", doAdvancedPlot: false, name: "f(x)" },
	rightConfig: { strokecolor: "#0000ff", doAdvancedPlot: false, name: "g(x)" },
	foldConfig: { strokecolor: "#000000", name: "(f⁕g)" },
	boardConfig: { axis: true, boundingbox: [-5, 1.5, 5, -1], showCopyright: false, showNavigation: false },
	leftRightGraphHeight: 150,
	foldGraphHeight: 350,
	sliderMax: 3.5,
}
type Config = typeof defaultConfig;
type Point = { x: number, y: number };
type Func = (x: number) => number;
interface MFunction {
	fn: (...params: Point[]) => Func,
	tex: (x: string) => string,
	defaultparams: Point[]
}
const diracA = 0.08;
const functions: { [name: string]: MFunction } = {
	Triangle: {
		fn: size => x => Math.abs(x) <= size.x ? size.y - Math.abs(x) / size.x * size.y : 0,
		defaultparams: [{ x: 1, y: 1 }],
		tex: x => raw`
			\begin{cases}
				1 - |${x}| & \text{for } |${x}| \leq 1 \\
				0 & \text{otherwise}
			\end{cases}
		`,
	},
	Square: {
		fn: size => x => Math.abs(x) <= size.x ? size.y : 0,
		defaultparams: [{ x: 1, y: 1 }],
		tex: x => raw`
			\begin{cases}
				1 & \text{for }|${x}| \leq 1 \\
				0 & \text{else}
			\end{cases}
		`
	},
	"Dirac Delta": {
		fn: () => x => Math.exp(-x * x / diracA / diracA) / diracA / Math.sqrt(Math.PI),
		defaultparams: [],
		tex: x => raw`\frac{e^{-(${x})^2/\varepsilon^2}}{\varepsilon \sqrt \pi} \qquad (\varepsilon \rightarrow 0)`
	}
}
function raw(literals: any, ...placeholders: any[]) {
	let result = "";
	for (let i = 0; i < placeholders.length; i++)
		result += literals.raw[i] + placeholders[i];
    return result + literals.raw[literals.length - 1];
}
const convolutionMath = raw`
	(f * g)(t) = \int_{-\infty}^\infty f(\tau)\, g(t - \tau)\, d\tau
`;
function fold(f: Func, g: Func, t: number, tMax: number) {
	// http://hipersayanx.blogspot.de/2015/06/image-convolution.html
	let sum = 0;
	let step = 0.005;
	if (t > tMax) return NaN;
	for (let x = -5; x < 5; x += step) {
		sum += f(x) * g(t - x);
	}
	return sum * step;
}
class Gui extends React.Component<{}, Config> {
	leftGraph: any; rightGraph: any; foldGraph: any; slider: any;
	constructor(props: {}) {
		super(props);
		this.state = defaultConfig;
	}
	render() {
		const options = Object.keys(functions).map(f => <option value={f} key={f}>{f}</option>);
		return (
			<div>
				<div className="page-header"><h1>Convolution demo</h1></div>
				<div className="row">
					<div className="col-sm-6">
						<select className="form-control" value={this.state.leftFn} onChange={(x: any) => this.setState({ leftFn: x.target.value }) }>{options}</select>
						<p className="tex2jax_process">{`$$${this.state.leftConfig.name}=${functions[this.state.leftFn].tex("x")}$$`}</p>
						<div id="leftGraph" style={{ height: this.state.leftRightGraphHeight }} />
					</div>
					<div className="col-sm-6">
						<select className="form-control" value={this.state.rightFn} onChange={(x: any) => this.setState({ rightFn: x.target.value }) }>{options}</select>
						<p className="tex2jax_process">{`$$${this.state.rightConfig.name}=${functions[this.state.rightFn].tex("x")}$$`}</p>
						<div id="rightGraph" style={{ height: this.state.leftRightGraphHeight }} />
					</div>
				</div>
				<hr />
				<button onClick={() => { this.slider.moveTo([-4, 0]); this.slider.moveTo([4, 0], 10000) } }>Animate</button>
				<div className="col-sm-12" id="foldGraph" style={{ height: this.state.foldGraphHeight }} />
				<div className="col-sm-12 tex2jax_process">{raw`
					$$\begin{matrix}
						\text{red:} & f(x) & = & ${functions[this.state.leftFn].tex("x")}\\
						\text{blue:} & g(t-x) & = & ${functions[this.state.rightFn].tex("t-x")}\\
						\text{black:} & (f*g)(t) & = & ${convolutionMath} \\
						\text{purple:} & f(x) g(t-x) \\
						\end{matrix}
					$$`}
				</div>
				<footer><small><a href="https://github.com/phiresky/convolution-demo">Source on GitHub</a></small></footer>
			</div>
		)
	}
	componentDidMount() {
		this.componentDidUpdate({}, null);
	}
	getparams(params: any[]) {
		return params.map(p => ({ x: p.X(), y: p.Y() }));
	}
	componentDidUpdate(prevProps: {}, prevState: Config) {
		//JXG.JSXGraph.freeBoard("leftGraph");
		//JXG.JSXGraph.freeBoard("rightGraph");
		const f = functions[this.state.leftFn];
		const g = functions[this.state.rightFn];
		const fcfg = $.extend({}, this.state.defaultConfig, this.state.leftConfig);
		const gcfg = $.extend({}, this.state.defaultConfig, this.state.rightConfig);
		const foldcfg = $.extend({}, this.state.defaultConfig, this.state.foldConfig);
		this.leftGraph = JXG.JSXGraph.initBoard("leftGraph", this.state.boardConfig);
		this.rightGraph = JXG.JSXGraph.initBoard("rightGraph", this.state.boardConfig);
		this.foldGraph = JXG.JSXGraph.initBoard("foldGraph", $.extend({}, this.state.boardConfig, { boundingbox: [-5, 2, 5, -1] }));
		const fparams = f.defaultparams.map(p => this.leftGraph.create('point', [p.x, p.y], { size: 4, withLabel:false }));
		const gparams = g.defaultparams.map(p => this.rightGraph.create('point', [p.x, p.y], { size: 4, withLabel:false }));
		var ffn: Func, gfn: Func;
		const updateffn = () => {ffn = f.fn(...this.getparams(fparams)); this.foldGraph.update(); };
		const updategfn = () => {gfn = g.fn(...this.getparams(gparams)); this.foldGraph.update(); };
		updateffn(); updategfn();
		// to allow ffn and gfn updates
		const indirectffn = (x:number) => ffn(x), indirectgfn = (x:number) => gfn(x);
		this.leftGraph.create('functiongraph', [indirectffn], fcfg);
		this.rightGraph.create('functiongraph', [indirectgfn], gcfg);
		const s = this.state.sliderMax;
		const slider = this.slider = this.foldGraph.create('slider', [[-s, -.75], [s, -.75], [-s, -.75, s]], { name: 't' });
		this.foldGraph.create('functiongraph', [indirectffn], $.extend({}, fcfg, { withLabel: false }));
		this.foldGraph.create('functiongraph', [(x: number) => gfn(slider.Value() - x)], $.extend({}, gcfg, { withLabel: false }));
		this.foldGraph.create('functiongraph', [(t: number) => fold(ffn, gfn, t, slider.Value())], $.extend({}, foldcfg, { withLabel: false }));
		const ftimesg = this.foldGraph.create('functiongraph', [(x: number) => ffn(x) * gfn(slider.Value() - x)], { strokeColor: null, highlightStrokeColor: null });
		this.foldGraph.create('integral', [[-5, 5], ftimesg], { fillColor: "#808", highlightFillColor: null, strokeColor: null, highlightStrokeColor: null, withLabel: false });
		this.leftGraph.on("update", updateffn);
		this.rightGraph.on("update", updategfn);
		MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
	}
}

(window as any).gui = ReactDOM.render(<Gui/>, document.getElementById("reactContent"));
