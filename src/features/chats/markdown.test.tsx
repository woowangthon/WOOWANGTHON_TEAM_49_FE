// @vitest-environment jsdom
import { render,screen,cleanup } from '@testing-library/react';
import { afterEach,it,expect } from 'vitest';
import { ChatMarkdown } from './markdown';
afterEach(cleanup);
it('renders paragraphs lists code emphasis quotes tables and safe links',()=>{const {container}=render(<ChatMarkdown content={'# 제목\n\n**굵게** *기울임* `inline`\n\n- 하나\n- 둘\n\n1. 순서\n\n> 인용\n\n```ts\nconst value = 1;\n```\n\n[링크](https://example.com)\n\n| A | B |\n| - | - |\n| 값 | 값 |'}/>);for(const selector of ['h1','strong','em','ul','ol','blockquote','pre code','table'])expect(container.querySelector(selector)).toBeTruthy();expect(screen.getByRole('link').getAttribute('rel')).toBe('noopener noreferrer');});
it('blocks raw HTML unsafe schemes and all automatic images',()=>{const {container}=render(<ChatMarkdown content={'<script>alert(1)</script><iframe src="https://example.com"></iframe>\n\n[위험](javascript:alert%281%29) [data](data:text/html,hello) ![외부](https://example.com/image.png) [상대](//evil.test)'}/>);expect(container.querySelector('script,iframe,img,a')).toBeNull();});
it('handles partial streaming fences and links',()=>{const {rerender,container}=render(<ChatMarkdown content={'```ts\nconst x = "한'}/>);expect(container.querySelector('pre')).toBeTruthy();rerender(<ChatMarkdown content={'```ts\nconst x = "한글";\n```\n\n[링크](https://example.com)'}/>);expect(screen.getByRole('link')).toBeTruthy();});
