import React, { useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useResizeDetector } from 'react-resize-detector';
import * as d3 from 'd3';

const ChartContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  height: '100%',
  minHeight: 300,
  '& .axis': {
    '& line, & path': {
      stroke: theme.palette.divider,
    },
    '& text': {
      fill: theme.palette.text.secondary,
      fontSize: theme.typography.caption.fontSize,
    },
  },
  '& .grid-line': {
    stroke: theme.palette.divider,
    strokeWidth: 1,
    strokeDasharray: '3 3',
    opacity: 0.5,
  },
  '& .tooltip': {
    position: 'absolute',
    padding: theme.spacing(1, 1.5),
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    pointerEvents: 'none',
    boxShadow: theme.shadows[2],
    zIndex: 10,
    '& h4': {
      margin: 0,
      marginBottom: theme.spacing(0.5),
      color: theme.palette.text.primary,
      fontSize: theme.typography.body2.fontSize,
      fontWeight: theme.typography.fontWeightBold,
    },
    '& p': {
      margin: 0,
      color: theme.palette.text.secondary,
      fontSize: theme.typography.caption.fontSize,
    },
  },
}));

const ResponsiveChart = ({
  data,
  xAccessor,
  yAccessor,
  xLabel,
  yLabel,
  title,
  type = 'line',
  color = 'primary',
  margin = { top: 20, right: 30, bottom: 60, left: 60 },
  ...props
}) => {
  const theme = useTheme();
  const chartRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const { width, height, ref } = useResizeDetector();

  useEffect(() => {
    if (!width || !height || !data || data.length === 0) return;

    // Clear previous chart
    d3.select(chartRef.current).selectAll('*').remove();

    // Set up dimensions
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create SVG
    const svg = d3
      .select(chartRef.current)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const xScale = d3
      .scaleBand()
      .domain(data.map((d) => d[xAccessor]))
      .range([0, innerWidth])
      .padding(0.2);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d[yAccessor]) * 1.1])
      .nice()
      .range([innerHeight, 0]);

    // Add grid lines
    svg
      .selectAll('line.horizontalGrid')
      .data(yScale.ticks())
      .enter()
      .append('line')
      .attr('class', 'grid-line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d));

    // Add axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    svg
      .append('g')
      .attr('class', 'axis x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-65)');

    svg.append('g').attr('class', 'axis y-axis').call(yAxis);

    // Add axis labels
    if (xLabel) {
      svg
        .append('text')
        .attr('class', 'axis-label')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + margin.bottom - 10)
        .style('text-anchor', 'middle')
        .style('font-size', '0.8rem')
        .style('fill', theme.palette.text.secondary)
        .text(xLabel);
    }

    if (yLabel) {
      svg
        .append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -margin.left + 20)
        .style('text-anchor', 'middle')
        .style('font-size', '0.8rem')
        .style('fill', theme.palette.text.secondary)
        .text(yLabel);
    }

    // Add chart title
    if (title) {
      svg
        .append('text')
        .attr('class', 'chart-title')
        .attr('x', innerWidth / 2)
        .attr('y', -margin.top / 2)
        .style('text-anchor', 'middle')
        .style('font-size', '1rem')
        .style('font-weight', 'bold')
        .style('fill', theme.palette.text.primary)
        .text(title);
    }

    // Draw the chart based on type
    if (type === 'bar') {
      // Draw bars
      svg
        .selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', (d) => xScale(d[xAccessor]))
        .attr('y', (d) => yScale(d[yAccessor]))
        .attr('width', xScale.bandwidth())
        .attr('height', (d) => innerHeight - yScale(d[yAccessor]))
        .attr('fill', theme.palette[color].main)
        .attr('rx', 2)
        .attr('ry', 2)
        .on('mouseover', (event, d) => {
          setTooltip({
            x: event.pageX,
            y: event.pageY,
            data: d,
          });
        })
        .on('mouseout', () => setTooltip(null));
    } else {
      // Default to line chart
      const line = d3
        .line()
        .x((d) => xScale(d[xAccessor]) + xScale.bandwidth() / 2)
        .y((d) => yScale(d[yAccessor]))
        .curve(d3.curveMonotoneX);

      // Draw line
      svg
        .append('path')
        .datum(data)
        .attr('class', 'line')
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', theme.palette[color].main)
        .attr('stroke-width', 2);

      // Draw points
      svg
        .selectAll('.point')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'point')
        .attr('cx', (d) => xScale(d[xAccessor]) + xScale.bandwidth() / 2)
        .attr('cy', (d) => yScale(d[yAccessor]))
        .attr('r', 4)
        .attr('fill', theme.palette.background.paper)
        .attr('stroke', theme.palette[color].main)
        .attr('stroke-width', 2)
        .on('mouseover', (event, d) => {
          setTooltip({
            x: event.pageX,
            y: event.pageY,
            data: d,
          });
        })
        .on('mouseout', () => setTooltip(null));
    }
  }, [width, height, data, xAccessor, yAccessor, xLabel, yLabel, title, type, color, margin, theme]);

  return (
    <ChartContainer ref={ref} {...props}>
      <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
      {tooltip && (
        <div
          className="tooltip"
          style={{
            left: `${tooltip.x + 10}px`,
            top: `${tooltip.y + 10}px`,
          }}
        >
          <h4>{tooltip.data[xAccessor]}</h4>
          <p>
            {yLabel}: {tooltip.data[yAccessor]}
          </p>
        </div>
      )}
    </ChartContainer>
  );
};

ResponsiveChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  xAccessor: PropTypes.string.isRequired,
  yAccessor: PropTypes.string.isRequired,
  xLabel: PropTypes.string,
  yLabel: PropTypes.string,
  title: PropTypes.string,
  type: PropTypes.oneOf(['line', 'bar']),
  color: PropTypes.oneOf(['primary', 'secondary', 'error', 'warning', 'info', 'success']),
  margin: PropTypes.shape({
    top: PropTypes.number,
    right: PropTypes.number,
    bottom: PropTypes.number,
    left: PropTypes.number,
  }),
};

export default ResponsiveChart;
