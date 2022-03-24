# RockFall

[Live Version](https://greggman.github.io/rockfall/)

In the early 1980s, a game, [BoulderDash]() game out for the Atari 800. My friend John and I got addicted and cleared all the levels.

At some point John tried to reproduce the main logic of the game. He did this in a
language called [Action!](http://www.atarimania.com/utility-atari-400-800-xl-xe-action_12510.html).
It's pretty incredible to think someone stuck a language compiled and editor in a
16k cartridge!

In any case, John got something working. [The code](https://github.com/greggman/rockfall/blob/master/ROCK4.ACT) was not all that big. As such, over the years I've ported it
several times. I [ported it to C](https://github.com/greggman/rockfall/blob/master/rockfall.c) at some point. According to the comments that was 1992.

I once ported it to Z80 for the original GameBoy when I was first learning how it work.
I ported it to Java for some feature phone around 2003-2004 to bring to a job interview
at Namco Japan for their mobile division.

Recently (March 2022) I was going though some old backups and I saw it sitting there
and decided it might be fun to port it to JavaScript.

[My first attempt was to use emoji](https://greggman.github.io/rockfall/rockfall-emoji.html).

After that I thought it would be fun to use the tilemap shader I wrote for
[HFT-BoomBoom](https://github.com/greggman/hft-boomboom).

[This is the result](https://greggman.github.io/rockfall/).

