module.exports = function style(source) {
  const classes = Object.fromEntries([...source.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map((match) => [match[1], match[1]]));
  return `const css=${JSON.stringify(source)};const node=document.createElement('style');node.textContent=css;document.head.appendChild(node);module.exports=${JSON.stringify(classes)};`;
};
