'use client';

import React from 'react';
import MarkdownTestComponent from '@/components/chat/MarkdownTestComponent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

/**
 * Markdown Rendering Test Page
 * 
 * This page provides a comprehensive test suite for validating our Markdown rendering implementation.
 * It demonstrates that the Study Buddy chat interface now properly renders Markdown content
 * instead of displaying raw .md format.
 */
export default function StudyBuddyMarkdownTestPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto py-6 px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Study Buddy Markdown Fix Test</h1>
              <p className="text-muted-foreground mt-1">
                Testing the fix for proper Markdown rendering in Study Buddy chat
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/study-buddy">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Study Buddy
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto py-8 px-4">
        {/* Problem Statement */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span className="text-2xl">🔍</span>
              Problem Solved
            </CardTitle>
            <CardDescription>
              The Study Buddy chat interface was displaying AI responses in raw .md format instead of properly rendered content.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <h4 className="font-medium">❌ Before Fix:</h4>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm">
                  <p>```markdown</p>
                  <p>**Bold text** and *italic text* with `code`</p>
                  <p></p>
                  <p>```javascript</p>
                  <p>function test() &#123;&#123;</p>
                  <p>  console.log("Hello World");</p>
                  <p>&#125;&#125;</p>
                  <p>```</p>
                  <p></p>
                  <p>Math: x = (-b ± √(b^2 - 4ac)) / (2a)</p>
                  <p></p>
                  <p>| Name | Age |</p>
                  <p>|------|-----|</p>
                  <p>| John | 25  |</p>
                  <p></p>
                  <p>This was displayed as literal text instead of rendered content.</p>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium">✅ After Fix:</h4>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-sm">
                  <p><strong>Bold text</strong> and <em>italic text</em> with <code>code</code></p>
                  <div className="bg-gray-800 text-white rounded-lg p-3 my-2 font-mono text-sm overflow-x-auto">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs">javascript</span>
                    </div>
                    <pre><code>function test() &#123;
  console.log("Hello World");
&#125;</code></pre>
                  </div>
                  <p>Math: <span className="font-mono">x = (-b ± √(b² - 4ac)) / (2a)</span></p>
                  <div className="overflow-x-auto my-2">
                    <table className="border border-border w-full">
                      <thead>
                        <tr>
                          <th className="border border-border px-4 py-2 bg-muted font-semibold text-left">Name</th>
                          <th className="border border-border px-4 py-2 bg-muted font-semibold text-left">Age</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-border px-4 py-2">John</td>
                          <td className="border border-border px-4 py-2">25</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p>Now displays as properly formatted, styled content.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Implementation Details */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span className="text-2xl">🛠️</span>
              Implementation Details
            </CardTitle>
            <CardDescription>
              Technical overview of the Markdown rendering solution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-3">
                <h5 className="font-medium">🔧 Components Created</h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• MarkdownRenderer (secure parser)</li>
                  <li>• CodeBlock (syntax highlighting)</li>
                  <li>• MathBlock (KaTeX integration)</li>
                  <li>• Updated MessageBubble</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h5 className="font-medium">🛡️ Security Features</h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• XSS prevention</li>
                  <li>• Content sanitization</li>
                  <li>• Safe HTML filtering</li>
                  <li>• Protocol validation</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h5 className="font-medium">🎨 Features Supported</h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• GitHub Flavored Markdown</li>
                  <li>• Syntax highlighting</li>
                  <li>• Math formulas</li>
                  <li>• Tables & lists</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Suite */}
        <MarkdownTestComponent />
      </div>

      {/* Footer */}
      <div className="border-t bg-card mt-12">
        <div className="container mx-auto py-6 px-4">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              ✅ Markdown rendering fix successfully implemented and tested
            </p>
            <p className="text-sm text-muted-foreground">
              The Study Buddy chat now properly renders Markdown content with full security and performance optimizations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}