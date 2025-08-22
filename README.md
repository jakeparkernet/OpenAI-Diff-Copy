Creates a button in the OpenAI Chat and in Codex so users can actually copy the patched code instead of a either all of the lines or lines with a bunch of leading pluses and minuses.

The problem:

ChatGPT responds in diffs as raw text unless otherwise prompted, and it loves to do this by default. There's also no way to change this behavior as far as I could find. So you get this:

![why is this here.png](.attachments.722/814-760-max%20%285%29.png)

And the copy button results in this

![useless result.png](.attachments.722/854-780-max%20%284%29.png)

The solution:

Dude, just add a button (Copy Patched) in the coding bits that copy the code you need. You know these parts contain the code. What happened here?

Works in the canvas.

![much better ui.png](.attachments.722/854-780-max%20%283%29.png)

Works in chat proper.

![this is how it should be done.png](.attachments.722/image%20%284%29.png)

Event works in the one place that should, arguably, have it already - Codex!

![even works in Codex dot pea 'n gee](.attachments.722/image%20%288%29.png)

It's strange that this is the default behavior for the chat, and even for Codex (which is designed for developers). But the truly baffling thing is that someone (or many people) **must** have pointed out that this would be an issue during development, and someone up the chain told them no. I don't have any eyes into OpenAI, and I'm betting the UI gets a lot less love than the actual models at this point, but this seems like a severe usability oversight in a company that is supposed to making things intelligent.  
  
I won't rant for too long, but this is part of a greater trend in tech that I've been seeing for more than the last decade which is trying to make interfaces simpler and contain less information, presumably to make them more accessible. And maybe *somewhere*, that helped *someone*, but it also makes the whole thing a lot more difficult to use and, worse, makes the population using it dumber because they are training themselves not to do any critical thinking in order to solve their problems (which I bet would be an issue in an age of prolific artificial intelligence).

My two cents as a customer of OpenAI.

Special thanks to ChatGPT for coding this.