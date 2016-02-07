declare var JXG: any, MathJax: any;
import * as React from "react";
import * as ReactDOM from "react-dom";
import 'bootstrap';
import 'bootstrap/css/bootstrap.css!';
import * as $ from "jquery";

JXG.Options.text.fontSize = 16;
const defaultConfig = {
	leftFn: "Triangle", rightFn: "Square",
	defaultConfig: { strokewidth: 3, withLabel: true },
	leftConfig: { strokecolor: "#ff0000", doAdvancedPlot: false, name: "f(x)" },
	rightConfig: { strokecolor: "#0000ff", doAdvancedPlot: false, name: "g(x)" },
	foldConfig: { strokecolor: "#000000", name: "(f⁕g)" },
	boardConfig: { axis: true, boundingbox: [-5, 1.5, 5, -1], showCopyright: false, showNavigation:false },
	leftRightGraphHeight: 150,
	foldGraphHeight: 350,
	sliderMax: 3.5,
}
type Config = typeof defaultConfig;
interface MFunction {
	fn: (x: number) => number,
	tex: (x: string) => string
}
const diracA = 0.008;
const functions: { [name: string]: MFunction } = {
	Triangle: {
		fn: x => Math.abs(x) <= 1 ? 1 - Math.abs(x) : 0,
		tex: x => raw`
			\begin{cases}
				1 - |${x}| & \text{for } |${x}| \leq 1 \\
				0 & \text{otherwise}
			\end{cases}
		`,
	},
	Square: {
		fn: x => Math.abs(x) <= 1 ? 1 : 0,
		tex: x => raw`
			\begin{cases}
				1 & \text{for }|${x}| \leq 1 \\
				0 & \text{else}
			\end{cases}
		`
	},
	"Dirac Delta": {
		fn: x => Math.exp(-x * x / diracA / diracA) / diracA / Math.sqrt(Math.PI),
		tex: x => raw`\frac{e^{-(${x})^2/\varepsilon^2}}{\varepsilon \sqrt \pi} \qquad (\varepsilon \rightarrow 0)`
	}
}
function raw(literals: any, ...placeholders: any[]) {
	let result = "";
	for (let i = 0; i < placeholders.length; i++) 
		result += literals.raw[i] + placeholders[i];
    return result+ literals.raw[literals.length - 1];
}
const convolutionMath = raw`
	(f * g)(t) = \int_{-\infty}^\infty f(\tau)\, g(t - \tau)\, d\tau
`;
function fold(f: (x: number) => number, g: (x: number) => number, t: number, tMax: number) {
	// http://hipersayanx.blogspot.de/2015/06/image-convolution.html
	let sum = 0;
	let step = 0.01;
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
				<button onClick={() => {this.slider.moveTo([-4,0]); this.slider.moveTo([4,0],10000)}}>Animate</button>
				<div className="col-sm-12" id="foldGraph" style={{ height: this.state.foldGraphHeight }} />
				<div className="col-sm-12 tex2jax_process">{raw`
					$$\begin{matrix}
						\text{red:} & f(x) & = & ${functions[this.state.leftFn].tex("x")}\\
						\text{blue:} & g(t-x) & = & ${functions[this.state.rightFn].tex("t-x")}\\
						\text{black:} & (f*g)(t) & = & ${convolutionMath}
						\end{matrix}
					$$`}
				</div>
			</div>
		)
	}
	componentDidMount() {
		this.componentDidUpdate({}, null);
	}
	componentDidUpdate(prevProps: {}, prevState: Config) {
		//JXG.JSXGraph.freeBoard("leftGraph");
		//JXG.JSXGraph.freeBoard("rightGraph");
		const f = functions[this.state.leftFn].fn;
		const g = functions[this.state.rightFn].fn;
		const fcfg = $.extend({}, this.state.defaultConfig, this.state.leftConfig);
		const gcfg = $.extend({}, this.state.defaultConfig, this.state.rightConfig);
		const foldcfg = $.extend({}, this.state.defaultConfig, this.state.foldConfig);
		this.leftGraph = JXG.JSXGraph.initBoard("leftGraph", this.state.boardConfig);
		this.rightGraph = JXG.JSXGraph.initBoard("rightGraph", this.state.boardConfig);
		this.leftGraph.create('functiongraph', [f], fcfg);
		this.rightGraph.create('functiongraph', [g], gcfg);
		this.foldGraph = JXG.JSXGraph.initBoard("foldGraph", $.extend({}, this.state.boardConfig, {boundingbox: [-5, 2, 5, -1]}));
		const s = this.state.sliderMax;
		const slider = this.slider = this.foldGraph.create('slider', [[-s, -.75], [s, -.75], [-s, -.75, s]], { name: 't' });
		this.foldGraph.create('functiongraph', [(x: number) => Math.min(f(x), g(slider.Value() - x))], { fillColor: "#808", doAdvancedPlot: false })
		this.foldGraph.create('functiongraph', [f], $.extend({}, fcfg, {withLabel:false}));
		this.foldGraph.create('functiongraph', [(x: number) => g(slider.Value() - x)], $.extend({}, gcfg, {withLabel:false}));
		this.foldGraph.create('functiongraph', [(t: number) => fold(f, g, t, slider.Value())], $.extend({}, foldcfg, {withLabel:false}));
		MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
	}
}

(window as any).gui = ReactDOM.render(<Gui/>, document.getElementById("reactContent"));
console.log("hi");