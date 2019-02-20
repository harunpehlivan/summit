import * as d3 from "d3"
import similarity from "compute-cosine-similarity"

const layerChannelCounts = {
    'mixed3a': 256,
    'mixed3b': 480,
    'mixed4a': 508,
    'mixed4b': 512,
    'mixed4c': 512,
    'mixed4d': 528,
    'mixed4e': 832,
    'mixed5a': 832,
    'mixed5b': 1024
}

let layer = 'mixed4d';
let selectedClassIdx = 0;
const numClassesInClassBar = 250;

// left
let leftInner = d3.select('#left')
    .append('div')
    .attr('id', 'left-inner')

let leftInnerOptions = leftInner.append('div')
    .attr('id', 'left-inner-options')

let leftInnerClassBarWrapper = leftInner.append('div')
    .attr('id', 'left-inner-class-bar-wrapper')

// middle
let middleInner = d3.select('#middle')
    .append('div')
    .attr('id', 'middle-inner')

let middleInnerOptions = middleInner.append('div')
    .attr('id', 'middle-inner-options')

let middleInnerEmbeddingWrapper = middleInner.append('div')
    .attr('id', 'middle-inner-embedding-wrapper')

// right
let rightInner = d3.select('#right')
    .append('div')
    .attr('id', 'right-inner')

let rightInnerOptions = rightInner.append('div')
    .attr('id', 'right-inner-options')

let rightInnerEmbeddingWrapper = rightInner.append('div')
    .attr('id', 'right-inner-tree-wrapper')

d3.json('./data/imagenet.json').then(function (data) {
    console.log(data);
    window.data = data;

    let selectedClass = data[selectedClassIdx];
    console.log('selectedClass', selectedClass)

    leftInnerOptions.append('button')
        .attr('type', 'button')
        .text('Accuracy ascending')
        .on('click', () => {
            removeClassBars()
            document.getElementById('left-inner-class-bar-wrapper').scrollTop = 0;
            makeClassBars(data, layer, selectedClass, 'asc')
        })
        // .append('i')
        // .classed('material-icons', true)
        // .classed('md-24', true)
        // .text('arrow_downward')

    leftInnerOptions.append('br')
    leftInnerOptions.append('br')

    leftInnerOptions.append('button')
        .attr('type', 'button')
        .text('Accuracy descending')
        .on('click', () => {
            removeClassBars()
            document.getElementById('left-inner-class-bar-wrapper').scrollTop = 0;
            makeClassBars(data, layer, selectedClass, 'dsc')
        })

    function computeEmbeddingDistancesFromPointEuclidean(data, layer, point) {
        for (let i = 0; i < data.length; i++) {
            let distance = Math.sqrt(Math.pow(point.embedding[layer].x - data[i].embedding[layer].x, 2) + Math.pow(point.embedding[layer].y - data[i].embedding[layer].y, 2));
            data[i].distanceFromQueryPoint = distance
        }
    }
    // computeEmbeddingDistancesFromPointEuclidean(data, layer, selectedClass)

    function computeEmbeddingDistancesFromPointCosine(data, layer, point) {

        function topChannelsToVector(point, layer) {
            let pointVector = new Array(layerChannelCounts[layer]).fill(0);
            point.topChannels[layer].forEach(channel => {
                pointVector[channel.channel] = channel.count;
            });
            return pointVector
        }

        let selectedPointVector = topChannelsToVector(point, layer)

        for (let i = 0; i < data.length; i++) {
            let iterPointVector = topChannelsToVector(data[i], layer)
            let distance = similarity(selectedPointVector, iterPointVector)
            data[i].distanceFromQueryPoint = distance
        }
    }
    computeEmbeddingDistancesFromPointCosine(data, layer, selectedClass)


    function makeClassBars(data, layer, selectedClass, sortType) {
        // sortTypes:
        // 'dis': sort by class distance
        // 'asc': sort by class accuracy ascending
        // 'dsc': sort by class accuracy descending
        console.log(sortType)


        computeEmbeddingDistancesFromPointCosine(data, layer, selectedClass)

        let classBars;

        if (sortType === 'asc') {
            classBars = leftInnerClassBarWrapper.selectAll('.class-bar')
            .data(data
                .sort(function (x, y) {
                    return d3.ascending(x.topOneAcc, y.topOneAcc);
                })
                .slice(0, numClassesInClassBar)
            )
            .enter()
            .append('div')
            .classed('class-bar', true)

        } else if (sortType === 'dsc') {
            classBars = leftInnerClassBarWrapper.selectAll('.class-bar')
            .data(data
                .sort(function (x, y) {
                    return d3.descending(x.topOneAcc, y.topOneAcc);
                })
                .slice(0, numClassesInClassBar)
            )
            .enter()
            .append('div')
            .classed('class-bar', true)

        } else if (sortType === 'dis') {
            classBars = leftInnerClassBarWrapper.selectAll('.class-bar')
            .data(data
                .sort(function (x, y) {
                    return d3.descending(x.distanceFromQueryPoint, y.distanceFromQueryPoint);
                })
                .slice(0, numClassesInClassBar) // nearest n classes
            )
            .enter()
            .append('div')
            .classed('class-bar', true)
        }

        classBars
            .attr('id', d => 'class-bar-' + d.synset)
            .on('mouseover', d => {
                d3.select('#point-' + d.synset)
                    .classed('embedding-point-hover', true)

            })
            .on('mouseout', () => {
                d3.selectAll('.embedding-point')
                    .classed('embedding-point-hover', false)
            })

        let classBarTexts = classBars.append('div')
            .classed('class-bar-text-wrapper', true)
            .on('click', d => {
                removeClassBars()
                document.getElementById('left-inner-class-bar-wrapper').scrollTop = 0;
                makeClassBars(data, layer, d, 'dis')
            })
        
        classBarTexts.append('div')
            .classed('class-bar-text-name', true)
            .append('a')
            .text(d => d.name.replace(/_/g, ' ').toLowerCase())
            .attr('target', '_blank')
            .attr('href', d => 'http://www.google.com/search?q=' + d.name.replace('_', '+').toLowerCase())

        // classBarTexts.append('div')
        //     .classed('class-bar-text-instances', true)
        //     .text(d => d.numOfInstances)

        classBarTexts.append('div')
            .classed('class-bar-text-accuracy', true)
            .text(d => (100 * d.topOneAcc).toFixed(1) + '%')

        let classBarHistograms = classBarTexts.append('div')
            .classed('class-bar-text-histogram', true)
            // .text('h')

        const accuracyMargin = { top: 7, right: 0, bottom: 2, left: 0 }
        const accuracyWidth = 100 - accuracyMargin.left - accuracyMargin.right // 100 from flex-basis width of class-bar-text-accuracy
        const accuracyHeight = 25 - accuracyMargin.top - accuracyMargin.bottom // 100 from flex-basis width of class-bar-text-accuracy

        classBarHistograms
            .append('svg')
            .attr("width", accuracyWidth + accuracyMargin.left + accuracyMargin.right)
            .attr("height", accuracyHeight + accuracyMargin.top + accuracyMargin.bottom)
            // .style('border', '1px solid #eeeeee') // for debugging
            .append("g")
            .attr("transform", "translate(" + accuracyMargin.left + "," + accuracyMargin.top + ")")
            .attr('id', d => 'accuracy-' + d.synset)

        function makeAccuracyHistogram(c) {
            let accuracySVG = d3.select('#accuracy-' + c.synset)

            let accuracyX = d3.scaleLinear()
                .domain(d3.extent(c.accuracies)).nice()
                .range([0, accuracyWidth])

            let bins = d3.histogram()
                .domain(accuracyX.domain())
                .thresholds(accuracyX.ticks(20))
                (c.accuracies)

            let accuracyY = d3.scaleLinear()
                .domain([0, d3.max(bins, d => d.length)]).nice()
                .range([accuracyHeight, 0])

            let accuracyXAxis = accuracySVG
                .append('g')
                .attr("transform", "translate(0," + accuracyHeight + ")")
                .classed('accuracy-x-axis', true)
                .call(d3.axisBottom(accuracyX).tickSizeOuter(0).ticks(0))

            accuracySVG
                .append("g")
                .selectAll("rect")
                .data(bins)
                .enter().append("rect")
                .classed('accuracy-bar', true)
                .attr("x", d => accuracyX(d.x0)) // + 1?
                .attr("width", d => Math.max(0, accuracyX(d.x1) - accuracyX(d.x0) - 1))
                .attr("y", d => accuracyY(d.length))
                .attr("height", d => accuracyY(0) - accuracyY(d.length));

            // accuracySVG
            //     .append('text')
            //     // .attr('x', accuracyWidth / 2)
            //     // .attr('y', accuracyHeight / 2)
            //     .attr('x', accuracyMargin.left)
            //     .attr('y', accuracyHeight - accuracyMargin.bottom)
            //     // .attr('text-anchor', 'middle')
            //     .text(d => (100 * d.topOneAcc).toFixed(1) + '%')
            //     .classed('class-bar-text-accuracy-svg', true)
        }

        for (let i = 0; i < data.length; i++) {
            makeAccuracyHistogram(data[i])
        }

        let classBarBars = classBars.append('div')
            .classed('class-bar-bar-wrapper', true)
        
        let classBarBarsScale = d3.scaleLinear()
            .domain([0, 1]) // cosine similarity
            .range([0, 100]) // div width percentage
        
        classBarBars.append('div')
            .classed('class-bar-bar-data', true)
            .style('width', d => classBarBarsScale(d.distanceFromQueryPoint) + '%')

        classBarBars.append('div')
            .classed('class-bar-bar-background', true)
            .style('width', d => 100-classBarBarsScale(d.distanceFromQueryPoint) + '%')        

    }
    makeClassBars(data, layer, selectedClass, 'dis')

    // embedding
    function makeEmbedding(data, layer) {
        console.log('make embedding')

        // let embeddingSelect = middleInnerOptions
        //     .append('select')
        //     .attr('id', 'embedding-select')

        // embeddingSelect
        //     .selectAll('.embedding-select-options')
        //     .data(Object.keys(layerChannelCounts))
        //     .enter()
        //     .append('option')
        //     .text(d => { return d })
        //     .attr('value', d => { return d })

        // embeddingSelect
        //     .on('change', () => {
        //         layer = document.getElementById('embedding-select').value
        //         center()
        //         updateEmbedding(layer)
        //     })

        const netMargin = ({ top: 0, right: 20, bottom: 0, left: 20 })
        const netWidth = 300 - netMargin.left - netMargin.right
        const netHeight = 64 - netMargin.top - netMargin.bottom
        const middleLineHeight = 25;

        let networkSVG = middleInnerOptions
            .append('svg')
            .attr('width', netWidth + 'px')
            .attr('height', netHeight + 'px')
            .append("g")
            .attr("transform", "translate(" + netMargin.left + "," + netMargin.top + ")")
            .attr('id', 'net')
        
        networkSVG
            .append('line')
            .attr('x1', 0)
            .attr('x1', netWidth)
            .attr('y1', middleLineHeight)
            .attr('y2', middleLineHeight)
            .style('stroke', '#666666')

        let layers = Object.keys(layerChannelCounts);

        const netLayerWidth = 10
        const netLayerPadding = (netWidth - netMargin.left - (layers.length-1) * netLayerWidth) / layers.length

        networkSVG
            .selectAll('.layer-glyph')
            .data(layers)
            .enter()
            .append('rect')
            .attr('x', (d, i) => i * (netLayerWidth + netLayerPadding))
            .attr('y', 10)
            .attr('width', netLayerWidth)
            .attr('height', middleLineHeight+5)
            .classed('layer-glyph', true)
            .attr('id', d => 'layer-glyph-' + d)
            .on('click', (d) => {
                layer = d
                center()
                updateEmbedding(layer)
                d3.selectAll('.layer-glyph')
                    .classed('layer-glyph-selected', false)
                d3.select('#layer-glyph-' + layer)
                    .classed('layer-glyph-selected', true)
            })

        networkSVG
            .selectAll('.layer-glyph-label')
            .data(layers)
            .enter()
            .append('text')
            .text(d => d.slice(5))
            .attr('x', (d, i) => i * (netLayerWidth + netLayerPadding) + netLayerWidth/2)
            .attr('y', netHeight - 10)
            .attr('text-anchor', 'middle')
            .classed('layer-glyph-label', true)
            .on('click', (d) => {
                layer = d
                center()
                updateEmbedding(layer)
                d3.selectAll('.layer-glyph')
                    .classed('layer-glyph-selected', false)
                d3.select('#layer-glyph-' + layer)
                    .classed('layer-glyph-selected', true)
            })
        
        middleInnerOptions
            .append('div')
            .style('display', 'flex')
            .style('flex-direction', 'column')
            .style('justify-content', 'center')
            .style('padding-left', '10px')
            .append('button')
                .attr('type', 'button')
                .classed('square-button', true)
                .on('click', () => {
                    center()
                })
                .append('i')
                .classed('material-icons', true)
                .classed('md-24', true)
                .text('home')

        d3.select('#layer-glyph-' + layer)
            .classed('layer-glyph-selected', true) // init selected layer

        const embeddingMargin = ({ top: 40, right: 40, bottom: 40, left: 40 })
        const embeddingWidth = 700 - embeddingMargin.left - embeddingMargin.right
        const embeddingHeight = 790 - embeddingMargin.top - embeddingMargin.bottom // 790 based on laptop screen height

        let embeddingSVG = middleInnerEmbeddingWrapper
            .append('svg')
            .attr('viewBox', '0 0 ' + (embeddingWidth + embeddingMargin.left + embeddingMargin.right) + ' ' + (embeddingHeight + embeddingMargin.top + embeddingMargin.bottom))
            .attr('width', '100%')
            // .attr("width", embeddingWidth + embeddingMargin.left + embeddingMargin.right)
            // .attr("height", embeddingHeight + embeddingMargin.top + embeddingMargin.bottom)
            // .style('border', '1px solid #eeeeee') // for debugging

        let zoom = d3.zoom()
            .scaleExtent([.5, 50])
            .extent([[0, 0], [embeddingWidth, embeddingHeight]])
            .on("zoom", zoomed);

        let k = 1;

        let embeddingXZoomScale;
        let embeddingYZoomScale;
        function zoomed() {
            // create new scale objects based on event
            embeddingXZoomScale = d3.event.transform.rescaleX(embeddingY);
            embeddingYZoomScale = d3.event.transform.rescaleY(embeddingY);
            // update axes
            // gX.call(xAxis.scale(embeddingXZoomScale));
            // gY.call(yAxis.scale(embeddingYZoomScale));
            embeddingPoints
                .attr('cx', function (d) { return embeddingXZoomScale(d.embedding[layer].x) })
                .attr('cy', function (d) { return embeddingYZoomScale(d.embedding[layer].y) })
            embeddingG.selectAll('.embedding-point-label')
                .attr('x', d => embeddingXZoomScale(d.embedding[layer].x) + 7)
                .attr('y', d => embeddingYZoomScale(d.embedding[layer].y) + 4)

            k = d3.event.transform.k;
        }

        function center() {
            // embeddingSVG = d3.select("#container");
            // zoom.translate([0, 0]); // Resetting translate
            // zoom.scale(1);          // Resetting scale
            // embeddingSVG.transition()
            //     .duration(750)
            //     .attr("transform", "translate(0, 0)scale(1)");
            zoomRect.transition().duration(750).call(zoom.transform, d3.zoomIdentity.scale(1));

        }

        let zoomRect = embeddingSVG.append("rect")
            .attr("width", embeddingWidth)
            .attr("height", embeddingHeight)
            .style("fill", "none")
            .style("pointer-events", "all")
            .attr('transform', 'translate(' + embeddingMargin.left + ',' + embeddingMargin.top + ')')
            .call(zoom);

        let embeddingG = embeddingSVG
            .append("g")
            .attr("transform", "translate(" + embeddingMargin.left + "," + embeddingMargin.top + ")")
            .attr('id', 'embedding')
        // .call(zoom);

        embeddingSVG.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", embeddingWidth)
            .attr("height", embeddingHeight);

        function computeEmbeddingDomain(data, layer) {
            let xExtent = d3.extent(data, d => d.embedding[layer].x)
            let yExtent = d3.extent(data, d => d.embedding[layer].y)

            let domainMin = d3.min([xExtent[0], yExtent[0]])
            let domainMax = d3.max([xExtent[1], yExtent[1]])

            return [domainMin, domainMax]
        }
        let embeddingDomain = computeEmbeddingDomain(data, layer)

        let embeddingX = d3.scaleLinear()
            // .domain(d3.extent(data, d => d.embedding[layer].x))
            .domain(embeddingDomain)
            .range([0, embeddingWidth])

        let embeddingY = d3.scaleLinear()
            // .domain(d3.extent(data, d => d.embedding[layer].y))
            .domain(embeddingDomain)
            .range([0, embeddingHeight])

        // we are using embeddingY everywhere to make the plot 1:1, but this is hardcoded right now!
        // we just want the most negative and most positive extend on the input range domain

        embeddingXZoomScale = embeddingY;
        embeddingYZoomScale = embeddingY;

        // let tip = d3.tip()
        //     .attr('class', 'd3-tip')
        //     .offset([-20, 0])
        //     .html(function (d) { return d.name; });
        // embeddingSVG.call(tip)

        // let drPointSizeScale = d3.scaleLog()
        //     .domain(d3.extent(data, d => d.accuracy))
        //     .range([2,5])

        const distanceRadius = 0.5

        // let drHoverCircle = embeddingG.append('circle')
        //     .attr('id', 'dr-hover-circle')
        //     // .attr('r', 40)
        //     .attr('cx', 0)
        //     .attr('cy', 0)
        //     .style('visibility', 'hidden')
        //     .style('fill', 'rgba(255, 193, 7, 0.2)')
        //     .style('stroke', '#FFC107')
        //     .style('stroke-width', '2px')

        let embeddingPoints = embeddingG.append('g')
            .selectAll('.embedding-point')
            .data(data)
            .enter()
            .append('circle')
            // .attr('r', d => drPointSizeScale(d.accuracy))
            .attr('r', 5)
            .attr('cx', d => embeddingY(d.embedding[layer].x))
            .attr('cy', d => embeddingY(d.embedding[layer].y))
            .classed('embedding-point', true)
            .attr('id', d => 'point-' + d.synset)
            .on('mouseover', d => {
                // tip.show(d, document.getElementById(d.id))
                colorNearPoints(d)
                // drHoverCircle.style('visibility', 'visible')
                //     .attr('cx', embeddingXZoomScale(d.embedding[layer].x))
                //     .attr('cy', embeddingYZoomScale(d.embedding[layer].y))
                //     .attr('r', () => {
                //         let temp = embeddingXZoomScale(d.embedding[layer].x + distanceRadius) - embeddingXZoomScale(d.embedding[layer].x)
                //         return temp
                //     })
            })
            .on('mouseout', () => {
            //     tip.hide()
                // d3.selectAll('.embedding-point').style('fill', ' #666666')
                d3.selectAll('.embedding-point-label').text('')
            //     drHoverCircle.style('visibility', 'hidden')
            })
            // .on('click', d => makeProfile(d))

        let embeddingLabels = embeddingG.selectAll('.embedding-point-label')
            .data(data)
            .enter()
            .append('text')
            .classed('embedding-point-label', true)
            .attr('x', d => embeddingY(d.embedding[layer].x))
            .attr('y', d => embeddingY(d.embedding[layer].y))

        // function computeDRPointDistances(data, point) {
        //     for (let i = 0; i < data.length; i++) {
        //         let distance = Math.sqrt(Math.pow(point.embedding[layer].x - data[i].embedding[layer].x, 2) + Math.pow(point.embedding[layer].y - data[i].embedding[layer].y, 2));
        //         data[i].distanceFromQueryPoint = distance
        //     }
        // }
        function colorNearPoints(point) {

                // computeDRPointDistances(data, point)

                let colorScale = d3.scaleLinear()
                    .domain([0, d3.max(data, d => d.distanceFromQueryPoint)])
                    .interpolate(d3.interpolateHcl)
                    .range([d3.rgb("#FFC107"), d3.rgb('#dddddd')])

                // d3.selectAll('.embedding-point')
                //     .style('fill', d => {
                //         if (d.distanceFromQueryPoint < distanceRadius) {
                //             return colorScale(d.distanceFromQueryPoint)
                //         } else {
                //             return '#666666'
                //         }
                //     })

                if (k > 6) {

                    // data
                    //     .sort(function (x, y) {
                    //         return d3.descending(x.distanceFromQueryPoint, y.distanceFromQueryPoint);
                    //     })
                    //     .slice(0, numClassesInClassBar) // nearest n classes

                    d3.selectAll('.embedding-point-label')
                        .text(d => {
                            if (d.distanceFromQueryPoint < distanceRadius) {
                                return d.name
                            }
                        })
                }
            }

        function updateEmbedding(newLayer) {

            embeddingDomain = computeEmbeddingDomain(data, newLayer)

            embeddingX = d3.scaleLinear()
                // .domain(d3.extent(data, d => d.embedding[layer].x))
                .domain(embeddingDomain)
                .range([0, embeddingWidth])

            embeddingY = d3.scaleLinear()
                // .domain(d3.extent(data, d => d.embedding[layer].y))
                .domain(embeddingDomain)
                .range([0, embeddingHeight])

            embeddingXZoomScale = embeddingY;
            embeddingYZoomScale = embeddingY;

            d3.selectAll('.embedding-point')
                .transition()
                .duration(1000)
                .attr('cx', d => embeddingY(d.embedding[newLayer].x))
                .attr('cy', d => embeddingY(d.embedding[newLayer].y))


        }

    }
    makeEmbedding(data, layer)

});

function removeClassBars() {
    d3.selectAll('.class-bar').remove()
}

