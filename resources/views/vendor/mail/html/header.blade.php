@props(['url'])
<tr>
<td class="header">
<a href="{{ $url }}" style="display: inline-block;">
<img src="{{ asset('/images/logo/logo-v1.png') }}" class="logo" alt="Asociatia Auditorilor Interni din Republica Moldova">
{!! $slot !!}
</a>
</td>
</tr>
