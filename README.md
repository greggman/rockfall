# RockFall

[Live Version](https://greggman.github.io/rockfall/)

* Player 1: ASWD = move, left shift = Dig
* Player 2: ⬆⬇⬅➡️ = move, right shift = Dig

* Avoid Falling Rocks
* Push Rocks Left/Right
* Collect Diamonds or Eggs
* Avoid Enemies
* Drop Rocks on Butterflies for more Eggs
* Drop Rocks on Magic Walls to turn it them into Diamonds
* Surround Amoeba with rocks to turn into Diamonds
* When Amoeba gets too big it turns into Eggs

The levels are random so and there is no goal so it's just a proof of concept.
A real game would require hand designed or algorithmically generated levels.

## History

In the early 1980s, a game, [BoulderDash](https://en.wikipedia.org/wiki/Boulder_Dash) came out for the Atari 800. My friend John and I got addicted and cleared all the levels.

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

## Legal

I have no idea what the legal implications are. AFAICT, [Game Mechanics can not be
copyrighted](https://www.americanbar.org/groups/intellectual_property_law/publications/landslide/2014-15/march-april/not-playing-around-board-games-intellectual-property-law/)
but of course I am not a lawyer. Further, the game is 38yrs old so there are certainly
no valid patents. And of course, this is just derived. No idea how the original game
runs. In any case though, use at your own risk.

## LICENSE

MIT
