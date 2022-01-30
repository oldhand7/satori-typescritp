/**
 * This module calculates the layout of a text string. Currently the only
 * supported inline node is text. All other nodes are using block layout.
 */

// @TODO: Handle `text-align` options other than `left`.

import Yoga from 'yoga-layout-prebuilt'
import { LineBreaker } from 'css-line-break'

import type { LayoutContext } from './layout'
import text from './builder/text'

export default function* buildTextNodes(content, context: LayoutContext) {
  const { parentStyle, parent, font } = context

  const breaker = LineBreaker(content, {
    lineBreak: 'strict',
    wordBreak: 'normal',
  })

  const words = []
  for (let br; !(br = breaker.next()).done; ) {
    words.push(br.value.slice())
  }

  const nodes = []

  // @TODO: Find a better way to avoid overriding the parent node.
  parent.setAlignItems(Yoga.ALIGN_BASELINE)
  if (parentStyle.textAlign === 'left') {
    parent.setJustifyContent(Yoga.JUSTIFY_FLEX_START)
  } else if (parentStyle.textAlign === 'center') {
    parent.setJustifyContent(Yoga.JUSTIFY_CENTER)
  } else if (parentStyle.textAlign === 'right') {
    parent.setJustifyContent(Yoga.JUSTIFY_FLEX_END)
  } else if (parentStyle.textAlign === 'justify') {
    parent.setJustifyContent(Yoga.JUSTIFY_SPACE_BETWEEN)
  }

  for (const word of words) {
    const node = Yoga.Node.create()
    parent.insertChild(node, parent.getChildCount())

    const measured = font.measure(word, parentStyle as any)

    // @TODO: Use grapheme-splitter to get the correct character number.
    const letterSpacing =
      ((parentStyle.letterSpacing as number) || 0) * word.length

    node.setWidth(measured.width + letterSpacing)
    node.setHeight(measured.ascent * 1.2)
    node.setMargin(Yoga.EDGE_BOTTOM, measured.descent * 1.2)

    nodes.push(node)
  }

  const [x, y] = yield

  let result = ''

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (parentStyle.position === 'absolute') {
      node.calculateLayout()
    }

    let { left, top, width, height } = node.getComputedLayout()

    // Attach offset to the current node.
    left += x
    top += y

    result += text({ left, top, width, height, content: words[i] }, parentStyle)
  }

  return result
}
